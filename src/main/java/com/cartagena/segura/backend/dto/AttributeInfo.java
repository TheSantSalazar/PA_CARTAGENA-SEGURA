package com.cartagena.segura.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AttributeInfo {
    private String name;
    private String type; // "numeric" o "nominal"
    private int index;
    private List<String> possibleValues; // Solo para nominales
}