package com.cartagena.segura.backend.controller;

import com.cartagena.segura.backend.dto.*;
import com.cartagena.segura.backend.service.AdvancedWekaService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ml")
@CrossOrigin(origins = "*")
public class MLController {

    @Autowired
    private AdvancedWekaService wekaService;

    // ========== PREDICCIÓN ==========

    /**
     * Realizar predicción individual con modelo activo
     * POST /api/ml/predict
     * Body: {"features": {"age": 25, "income": 30000, ...}}
     */
    @PostMapping("/predict")
    public ResponseEntity<?> predict(@RequestBody PredictionRequest request) {
        try {
            log.info("Predicción solicitada con features: {}", request.getFeatures().keySet());
            PredictionResponse response = wekaService.predict(request.getFeatures());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Error de argumento: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Error en predicción", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Error en predicción: " + e.getMessage()));
        }
    }

    /**
     * Predicción con modelo específico
     * POST /api/ml/predict/{modelName}
     */
    @PostMapping("/predict/{modelName}")
    public ResponseEntity<?> predictWithModel(
            @PathVariable String modelName,
            @RequestBody PredictionRequest request) {
        try {
            log.info("Predicción con modelo: {}", modelName);
            PredictionResponse response = wekaService.predict(request.getFeatures(), modelName);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error en predicción con modelo {}: {}", modelName, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Error: " + e.getMessage()));
        }
    }

    /**
     * Predicción en lote
     * POST /api/ml/predict/batch
     * Body: {"instances": [{"age": 25, ...}, {"age": 30, ...}]}
     */
    @PostMapping("/predict/batch")
    public ResponseEntity<?> predictBatch(@RequestBody BatchPredictionRequest request) {
        try {
            log.info("Predicción en lote: {} instancias", request.getInstances().size());
            List<PredictionResponse> responses = wekaService.predictBatch(request.getInstances());
            return ResponseEntity.ok(Map.of(
                    "total", request.getInstances().size(),
                    "results", responses
            ));
        } catch (Exception e) {
            log.error("Error en lote", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Error en lote: " + e.getMessage()));
        }
    }

    // ========== ENTRENAMIENTO ==========

    /**
     * Entrenar modelo desde archivo ARFF
     * POST /api/ml/train/arff
     */
    @PostMapping("/train/arff")
    public ResponseEntity<?> trainFromArff(
            @RequestParam("file") MultipartFile file,
            @RequestParam("algorithm") String algorithm,
            @RequestParam("modelName") String modelName) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Archivo vacío"));
            }

            log.info("Entrenamiento ARFF: modelo={}, algoritmo={}", modelName, algorithm);

            // Guardar archivo temporal
            File tempFile = File.createTempFile("train_", ".arff");
            file.transferTo(tempFile);

            // Entrenar
            TrainingResponse response = wekaService.trainFromArff(
                    tempFile.getAbsolutePath(), algorithm, modelName);

            tempFile.delete();

            log.info("Entrenamiento completado. Precisión: {}", response.getAccuracy());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error al entrenar desde ARFF", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Error al entrenar: " + e.getMessage()));
        }
    }

    /**
     * Entrenar modelo desde archivo CSV
     * POST /api/ml/train/csv
     */
    @PostMapping("/train/csv")
    public ResponseEntity<?> trainFromCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam("algorithm") String algorithm,
            @RequestParam("modelName") String modelName,
            @RequestParam(value = "classIndex", defaultValue = "-1") int classIndex) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Archivo vacío"));
            }

            log.info("Entrenamiento CSV: modelo={}, algoritmo={}, classIndex={}",
                    modelName, algorithm, classIndex);

            File tempFile = File.createTempFile("train_", ".csv");
            file.transferTo(tempFile);

            TrainingResponse response = wekaService.trainFromCsv(
                    tempFile.getAbsolutePath(), algorithm, modelName, classIndex);

            tempFile.delete();

            log.info("Entrenamiento CSV completado. Precisión: {}", response.getAccuracy());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error al entrenar desde CSV", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Error al entrenar: " + e.getMessage()));
        }
    }

    // ========== GESTIÓN DE MODELOS ==========

    /**
     * Listar todos los modelos
     * GET /api/ml/models
     */
    @GetMapping("/models")
    public ResponseEntity<?> getAllModels() {
        try {
            log.debug("Listando todos los modelos");
            List<ModelInfo> models = wekaService.getAllModelsInfo();
            return ResponseEntity.ok(Map.of(
                    "total", models.size(),
                    "models", models
            ));
        } catch (Exception e) {
            log.error("Error al listar modelos", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * Obtener información de un modelo
     * GET /api/ml/models/{modelName}
     */
    @GetMapping("/models/{modelName}")
    public ResponseEntity<?> getModelInfo(@PathVariable String modelName) {
        try {
            log.debug("Obteniendo info del modelo: {}", modelName);
            ModelInfo info = wekaService.getModelInfo(modelName);
            return ResponseEntity.ok(info);
        } catch (IllegalArgumentException e) {
            log.warn("Modelo no encontrado: {}", modelName);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Modelo no encontrado: " + modelName));
        } catch (Exception e) {
            log.error("Error al obtener info del modelo", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * Establecer modelo activo
     * PUT /api/ml/models/{modelName}/activate
     */
    @PutMapping("/models/{modelName}/activate")
    public ResponseEntity<?> activateModel(@PathVariable String modelName) {
        try {
            log.info("Activando modelo: {}", modelName);
            wekaService.setActiveModel(modelName);
            return ResponseEntity.ok(Map.of(
                    "message", "Modelo activado exitosamente",
                    "activeModel", modelName
            ));
        } catch (Exception e) {
            log.error("Error al activar modelo", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * Eliminar modelo
     * DELETE /api/ml/models/{modelName}
     */
    @DeleteMapping("/models/{modelName}")
    public ResponseEntity<?> deleteModel(@PathVariable String modelName) {
        try {
            log.info("Eliminando modelo: {}", modelName);
            wekaService.deleteModel(modelName);
            return ResponseEntity.ok(Map.of(
                    "message", "Modelo eliminado exitosamente",
                    "deletedModel", modelName
            ));
        } catch (IllegalStateException e) {
            log.warn("No se puede eliminar modelo activo: {}", modelName);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            log.error("Error al eliminar modelo", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(e.getMessage()));
        }
    }

    /**
     * Cargar modelo existente
     * POST /api/ml/models/load/{modelName}
     */
    @PostMapping("/models/load/{modelName}")
    public ResponseEntity<?> loadModel(@PathVariable String modelName) {
        try {
            log.info("Cargando modelo: {}", modelName);
            wekaService.loadModel(modelName);
            return ResponseEntity.ok(Map.of(
                    "message", "Modelo cargado exitosamente",
                    "modelName", modelName
            ));
        } catch (Exception e) {
            log.error("Error al cargar modelo", e);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("No se pudo cargar el modelo: " + e.getMessage()));
        }
    }

    // ========== EVALUACIÓN ==========

    /**
     * Evaluar modelo con datos de prueba
     * POST /api/ml/evaluate/{modelName}
     */
    @PostMapping("/evaluate/{modelName}")
    public ResponseEntity<?> evaluateModel(
            @PathVariable String modelName,
            @RequestParam("file") MultipartFile file) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Archivo vacío"));
            }

            log.info("Evaluando modelo: {} con archivo: {}", modelName, file.getOriginalFilename());

            String extension = file.getOriginalFilename().endsWith(".csv") ? ".csv" : ".arff";
            File tempFile = File.createTempFile("test_", extension);
            file.transferTo(tempFile);

            EvaluationResponse response = wekaService.evaluateModel(
                    modelName, tempFile.getAbsolutePath());

            tempFile.delete();

            log.info("Evaluación completada. Precisión: {}", response.getAccuracy());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error en evaluación", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Error en evaluación: " + e.getMessage()));
        }
    }

    // ========== INFORMACIÓN DEL SISTEMA ==========

    /**
     * Obtener algoritmos disponibles
     * GET /api/ml/algorithms
     */
    @GetMapping("/algorithms")
    public ResponseEntity<?> getAvailableAlgorithms() {
        Map<String, Object> algorithms = new HashMap<>();

        algorithms.put("trees", List.of(
                Map.of("name", "J48", "description", "Árbol de decisión C4.5", "type", "classification"),
                Map.of("name", "RandomForest", "description", "Bosque aleatorio", "type", "classification"),
                Map.of("name", "REPTree", "description", "Árbol con poda reducida", "type", "classification")
        ));

        algorithms.put("functions", List.of(
                Map.of("name", "SMO", "description", "Support Vector Machine", "type", "classification"),
                Map.of("name", "Logistic", "description", "Regresión logística", "type", "classification")
        ));

        algorithms.put("bayes", List.of(
                Map.of("name", "NaiveBayes", "description", "Clasificador Naive Bayes", "type", "classification")
        ));

        algorithms.put("rules", List.of(
                Map.of("name", "JRip", "description", "Reglas de clasificación", "type", "classification")
        ));

        log.debug("Retornando algoritmos disponibles");
        return ResponseEntity.ok(Map.of(
                "total", 7,
                "algorithms", algorithms
        ));
    }

    /**
     * Health check del servicio ML
     * GET /api/ml/health
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "WEKA ML Service",
                "timestamp", System.currentTimeMillis()
        ));
    }

    // ========== MÉTODOS AUXILIARES ==========

    /**
     * Crear respuesta de error estándar
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", true);
        error.put("message", message);
        error.put("timestamp", System.currentTimeMillis());
        return error;
    }
}