package com.cartagena.segura.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "logs")
public class LogEntry {
    @Id
    private String id;
    private String action;
    private String user;
    private String details;
    private LocalDateTime timestamp = LocalDateTime.now();

    public LogEntry() {}

    public LogEntry(String action, String user, String details) {
        this.action = action;
        this.user = user;
        this.details = details;
    }

    // Getters y setters
    public String getId() { return id; }
    public String getAction() { return action; }
    public String getUser() { return user; }
    public String getDetails() { return details; }
    public LocalDateTime getTimestamp() { return timestamp; }

    public void setId(String id) { this.id = id; }
    public void setAction(String action) { this.action = action; }
    public void setUser(String user) { this.user = user; }
    public void setDetails(String details) { this.details = details; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
