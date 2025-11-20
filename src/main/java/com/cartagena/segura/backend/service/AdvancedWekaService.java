package com.cartagena.segura.backend.service;

import com.cartagena.segura.backend.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import weka.classifiers.Classifier;
import weka.classifiers.Evaluation;
import weka.classifiers.bayes.NaiveBayes;
import weka.classifiers.functions.SMO;
import weka.classifiers.rules.JRip;
import weka.classifiers.trees.J48;
import weka.classifiers.trees.RandomForest;
import weka.core.*;
import weka.core.converters.ArffSaver;
import weka.core.converters.CSVLoader;
import weka.core.converters.ConverterUtils.DataSource;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AdvancedWekaService {

    private static final String MODELS_DIR = "models/";
    private Map<String, ModelWrapper> loadedModels = new HashMap<>();
    private String activeModelName = "default";

    static class ModelWrapper {
        Classifier classifier;
        Instances dataStructure;
        String algorithm;
        Date trainedDate;

        ModelWrapper(Classifier classifier, Instances dataStructure, String algorithm) {
            this.classifier = classifier;
            this.dataStructure = dataStructure;
            this.algorithm = algorithm;
            this.trainedDate = new Date();
        }
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(MODELS_DIR));
            log.info("✓ Directorio de modelos creado: {}", MODELS_DIR);

            loadAllModels();

            if (loadedModels.isEmpty()) {
                log.warn("No se encontraron modelos. Creando modelo por defecto...");
                createDefaultModel();
            }

            log.info("✓ Servicio WEKA iniciado. Modelos: {}", loadedModels.keySet());
        } catch (Exception e) {
            log.error("✗ Error inicializando WEKA", e);
        }
    }

    private void loadAllModels() throws Exception {
        File modelsDir = new File(MODELS_DIR);
        File[] modelFiles = modelsDir.listFiles((dir, name) -> name.endsWith(".model"));

        if (modelFiles != null) {
            for (File modelFile : modelFiles) {
                String modelName = modelFile.getName().replace(".model", "");
                try {
                    loadModel(modelName);
                    log.info("✓ Modelo cargado: {}", modelName);
                } catch (Exception e) {
                    log.error("✗ Error cargando {}: {}", modelName, e.getMessage());
                }
            }
        }
    }

    public void loadModel(String modelName) throws Exception {
        String modelPath = MODELS_DIR + modelName + ".model";
        String arffPath = MODELS_DIR + modelName + ".arff";

        if (!new File(modelPath).exists()) {
            throw new FileNotFoundException("Modelo no encontrado: " + modelPath);
        }

        Classifier classifier = (Classifier) SerializationHelper.read(modelPath);
        DataSource source = new DataSource(arffPath);
        Instances dataStructure = source.getDataSet();

        if (dataStructure.classIndex() == -1) {
            dataStructure.setClassIndex(dataStructure.numAttributes() - 1);
        }

        String algorithm = classifier.getClass().getSimpleName();
        ModelWrapper wrapper = new ModelWrapper(classifier, dataStructure, algorithm);
        loadedModels.put(modelName, wrapper);

        if (loadedModels.size() == 1) {
            activeModelName = modelName;
        }
    }

    public TrainingResponse trainFromArff(String arffFilePath, String algorithm, String modelName)
            throws Exception {
        log.info("Entrenando desde ARFF: {}, algoritmo: {}", arffFilePath, algorithm);

        DataSource source = new DataSource(arffFilePath);
        Instances trainData = source.getDataSet();
        trainData.setClassIndex(trainData.numAttributes() - 1);

        Classifier classifier = createClassifier(algorithm);

        long startTime = System.currentTimeMillis();
        classifier.buildClassifier(trainData);
        long trainingTime = System.currentTimeMillis() - startTime;

        Evaluation eval = new Evaluation(trainData);
        eval.crossValidateModel(classifier, trainData, 10, new Random(1));

        String modelPath = MODELS_DIR + modelName + ".model";
        String arffPath = MODELS_DIR + modelName + ".arff";

        SerializationHelper.write(modelPath, classifier);
        Files.copy(Paths.get(arffFilePath), Paths.get(arffPath),
                StandardCopyOption.REPLACE_EXISTING);

        Instances dataStructure = new Instances(trainData, 0);
        ModelWrapper wrapper = new ModelWrapper(classifier, dataStructure, algorithm);
        loadedModels.put(modelName, wrapper);

        TrainingResponse response = new TrainingResponse();
        response.setModelName(modelName);
        response.setAlgorithm(algorithm);
        response.setTrainingTimeMs(trainingTime);
        response.setAccuracy(eval.pctCorrect());
        response.setKappa(eval.kappa());
        response.setNumInstances(trainData.numInstances());
        response.setNumAttributes(trainData.numAttributes());
        response.setEvaluationSummary(eval.toSummaryString());
        response.setConfusionMatrix(eval.toMatrixString());

        log.info("✓ Entrenamiento completado. Precisión: {}", eval.pctCorrect());
        return response;
    }

    public TrainingResponse trainFromCsv(String csvFilePath, String algorithm,
                                         String modelName, int classIndex) throws Exception {
        log.info("Entrenando desde CSV: {}", csvFilePath);

        CSVLoader loader = new CSVLoader();
        loader.setSource(new File(csvFilePath));
        Instances data = loader.getDataSet();

        if (classIndex == -1) {
            classIndex = data.numAttributes() - 1;
        }
        data.setClassIndex(classIndex);

        String tempArffPath = MODELS_DIR + "temp_" + System.currentTimeMillis() + ".arff";
        ArffSaver saver = new ArffSaver();
        saver.setInstances(data);
        saver.setFile(new File(tempArffPath));
        saver.writeBatch();

        TrainingResponse response = trainFromArff(tempArffPath, algorithm, modelName);

        Files.move(Paths.get(tempArffPath),
                Paths.get(MODELS_DIR + modelName + ".arff"),
                StandardCopyOption.REPLACE_EXISTING);

        return response;
    }

    public PredictionResponse predict(Map<String, Object> features) throws Exception {
        return predict(features, activeModelName);
    }

    public PredictionResponse predict(Map<String, Object> features, String modelName)
            throws Exception {
        ModelWrapper model = loadedModels.get(modelName);
        if (model == null) {
            throw new IllegalArgumentException("Modelo no encontrado: " + modelName);
        }

        Instance instance = createInstance(features, model.dataStructure);

        double predictionIndex = model.classifier.classifyInstance(instance);
        String prediction = model.dataStructure.classAttribute().value((int) predictionIndex);

        double[] distribution = model.classifier.distributionForInstance(instance);
        double confidence = distribution[(int) predictionIndex];

        Map<String, Double> distributionMap = new LinkedHashMap<>();
        Attribute classAttr = model.dataStructure.classAttribute();

        for (int i = 0; i < distribution.length; i++) {
            distributionMap.put(classAttr.value(i), distribution[i]);
        }

        PredictionResponse response = new PredictionResponse();
        response.setPrediction(prediction);
        response.setConfidence(confidence);
        response.setDistribution(distributionMap);
        response.setModelName(modelName);
        response.setAlgorithm(model.algorithm);

        return response;
    }

    public List<PredictionResponse> predictBatch(List<Map<String, Object>> featuresList)
            throws Exception {
        List<PredictionResponse> responses = new ArrayList<>();
        for (Map<String, Object> features : featuresList) {
            try {
                responses.add(predict(features));
            } catch (Exception e) {
                log.error("Error en predicción", e);
            }
        }
        return responses;
    }

    public List<ModelInfo> getAllModelsInfo() {
        return loadedModels.entrySet().stream()
                .map(entry -> {
                    ModelInfo info = createModelInfo(entry.getValue());
                    info.setModelName(entry.getKey());
                    info.setActive(entry.getKey().equals(activeModelName));
                    return info;
                })
                .collect(Collectors.toList());
    }

    public ModelInfo getModelInfo(String modelName) {
        ModelWrapper model = loadedModels.get(modelName);
        if (model == null) {
            throw new IllegalArgumentException("Modelo no encontrado: " + modelName);
        }

        ModelInfo info = createModelInfo(model);
        info.setModelName(modelName);
        info.setActive(modelName.equals(activeModelName));
        return info;
    }

    public void setActiveModel(String modelName) {
        if (!loadedModels.containsKey(modelName)) {
            throw new IllegalArgumentException("Modelo no encontrado: " + modelName);
        }
        this.activeModelName = modelName;
        log.info("✓ Modelo activo: {}", modelName);
    }

    public void deleteModel(String modelName) throws IOException {
        if (modelName.equals(activeModelName) && loadedModels.size() > 1) {
            throw new IllegalStateException("No se puede eliminar el modelo activo");
        }

        loadedModels.remove(modelName);
        Files.deleteIfExists(Paths.get(MODELS_DIR + modelName + ".model"));
        Files.deleteIfExists(Paths.get(MODELS_DIR + modelName + ".arff"));

        log.info("✓ Modelo eliminado: {}", modelName);
    }

    public EvaluationResponse evaluateModel(String modelName, String testDataPath)
            throws Exception {
        ModelWrapper model = loadedModels.get(modelName);
        if (model == null) {
            throw new IllegalArgumentException("Modelo no encontrado: " + modelName);
        }

        DataSource source = new DataSource(testDataPath);
        Instances testData = source.getDataSet();
        testData.setClassIndex(testData.numAttributes() - 1);

        Evaluation eval = new Evaluation(testData);
        eval.evaluateModel(model.classifier, testData);

        EvaluationResponse response = new EvaluationResponse();
        response.setModelName(modelName);
        response.setAccuracy(eval.pctCorrect());
        response.setKappa(eval.kappa());
        response.setPrecision(eval.weightedPrecision());
        response.setRecall(eval.weightedRecall());
        response.setF1Score(eval.weightedFMeasure());
        response.setSummary(eval.toSummaryString());
        response.setConfusionMatrix(eval.toMatrixString());
        response.setDetailedAccuracyByClass(eval.toClassDetailsString());

        return response;
    }

    private Classifier createClassifier(String algorithm) {
        switch (algorithm.toLowerCase()) {
            case "j48":
                J48 j48 = new J48();
                j48.setUnpruned(false);
                j48.setConfidenceFactor(0.25f);
                return j48;
            case "randomforest":
                RandomForest rf = new RandomForest();
                rf.setNumIterations(100);
                return rf;
            case "smo":
            case "svm":
                return new SMO();
            case "naivebayes":
                return new NaiveBayes();
            case "jrip":
                return new JRip();
            default:
                return new J48();
        }
    }

    private Instance createInstance(Map<String, Object> features, Instances dataStructure) {
        Instance instance = new DenseInstance(dataStructure.numAttributes());
        instance.setDataset(dataStructure);

        for (int i = 0; i < dataStructure.numAttributes() - 1; i++) {
            Attribute attr = dataStructure.attribute(i);

            if (features.containsKey(attr.name())) {
                Object value = features.get(attr.name());

                if (attr.isNumeric()) {
                    if (value instanceof Number) {
                        instance.setValue(attr, ((Number) value).doubleValue());
                    } else {
                        instance.setValue(attr, Double.parseDouble(value.toString()));
                    }
                } else if (attr.isNominal()) {
                    instance.setValue(attr, value.toString());
                }
            } else {
                instance.setMissing(attr);
            }
        }

        return instance;
    }

    private ModelInfo createModelInfo(ModelWrapper model) {
        ModelInfo info = new ModelInfo();
        info.setModelType(model.classifier.getClass().getSuperclass().getSimpleName());
        info.setAlgorithm(model.algorithm);
        info.setTrainedDate(model.trainedDate);

        List<AttributeInfo> attributes = new ArrayList<>();
        for (int i = 0; i < model.dataStructure.numAttributes(); i++) {
            Attribute attr = model.dataStructure.attribute(i);
            AttributeInfo attrInfo = new AttributeInfo();
            attrInfo.setName(attr.name());
            attrInfo.setType(attr.isNumeric() ? "numeric" : "nominal");
            attrInfo.setIndex(i);

            if (attr.isNominal()) {
                List<String> values = new ArrayList<>();
                for (int j = 0; j < attr.numValues(); j++) {
                    values.add(attr.value(j));
                }
                attrInfo.setPossibleValues(values);
            }

            attributes.add(attrInfo);
        }
        info.setAttributes(attributes);
        info.setClassAttribute(model.dataStructure.classAttribute().name());

        return info;
    }

    private void createDefaultModel() throws Exception {
        ArrayList<Attribute> attributes = new ArrayList<>();
        attributes.add(new Attribute("age"));
        attributes.add(new Attribute("income"));
        attributes.add(new Attribute("credit_score"));

        ArrayList<String> classValues = new ArrayList<>();
        classValues.add("low");
        classValues.add("medium");
        classValues.add("high");
        attributes.add(new Attribute("risk", classValues));

        Instances data = new Instances("DefaultModel", attributes, 0);
        data.setClassIndex(data.numAttributes() - 1);

        double[][] samples = {
                {25, 30000, 650, 1},
                {45, 80000, 750, 0},
                {35, 45000, 600, 2},
                {28, 35000, 680, 1},
                {52, 95000, 780, 0},
                {30, 28000, 580, 2}
        };

        for (double[] sample : samples) {
            data.add(new DenseInstance(1.0, sample));
        }

        J48 classifier = new J48();
        classifier.buildClassifier(data);

        SerializationHelper.write(MODELS_DIR + "default.model", classifier);
        ArffSaver saver = new ArffSaver();
        saver.setInstances(data);
        saver.setFile(new File(MODELS_DIR + "default.arff"));
        saver.writeBatch();

        Instances structure = new Instances(data, 0);
        loadedModels.put("default", new ModelWrapper(classifier, structure, "J48"));
        activeModelName = "default";

        log.info("✓ Modelo por defecto creado");
    }
}