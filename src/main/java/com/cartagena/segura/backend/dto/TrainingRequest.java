package com.cartagena.segura.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class TrainingRequest {
    private String algorithm;
    private String modelName;
    private int classIndex;
    private Map<String, Object> parameters;
}