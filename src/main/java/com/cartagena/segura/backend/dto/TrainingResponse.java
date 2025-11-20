package com.cartagena.segura.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TrainingResponse {
    private String modelName;
    private String algorithm;
    private long trainingTimeMs;
    private double accuracy;
    private double kappa;
    private int numInstances;
    private int numAttributes;
    private String evaluationSummary;
    private String confusionMatrix;
}