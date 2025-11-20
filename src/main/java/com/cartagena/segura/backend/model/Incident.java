package com.cartagena.segura.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "incidents")
public class Incident {

    @Id
    private String id; // En Mongo se usa String por el ObjectId

    private String type;
    private String description;
    private String location;
    private Status status = Status.PENDING;

    public enum Status {
        PENDING,
        IN_PROGRESS,
        RESOLVED
    }

    public Incident() {}

    public Incident(String type, String description, String location, Status status) {
        this.type = type;
        this.description = description;
        this.location = location;
        this.status = status;
    }

    // Getters y Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
}
