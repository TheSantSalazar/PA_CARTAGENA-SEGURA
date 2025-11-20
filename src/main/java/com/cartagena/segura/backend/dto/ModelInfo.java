package com.cartagena.segura.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModelInfo {
    private String modelName;
    private String modelType;
    private String algorithm;
    private List<AttributeInfo> attributes;
    private String classAttribute;
    private Date trainedDate;
    private boolean active;
}