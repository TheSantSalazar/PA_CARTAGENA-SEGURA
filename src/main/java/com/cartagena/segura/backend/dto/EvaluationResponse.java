package com.cartagena.segura.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EvaluationResponse {
    private String modelName;
    private double accuracy;
    private double kappa;
    private double precision;
    private double recall;
    private double f1Score;
    private String summary;
    private String confusionMatrix;
    private String detailedAccuracyByClass;
}