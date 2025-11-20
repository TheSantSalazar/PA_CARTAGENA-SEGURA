package com.cartagena.segura.backend.controller;

import com.cartagena.segura.backend.model.LogEntry;
import com.cartagena.segura.backend.service.LogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*")
public class LogController {

    @Autowired
    private LogService logService;

    @GetMapping
    public List<LogEntry> getAllLogs() {
        return logService.getAllLogs();
    }
}
