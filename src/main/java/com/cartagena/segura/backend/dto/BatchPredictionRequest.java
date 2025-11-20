package com.cartagena.segura.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BatchPredictionRequest {
    private List<Map<String, Object>> instances;
    private String modelName;
}