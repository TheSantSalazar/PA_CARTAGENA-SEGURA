package com.cartagena.segura.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PredictionResponse {
    private String prediction;
    private Double confidence;
    private Map<String, Double> distribution;
    private String modelName;
    private String algorithm;
}