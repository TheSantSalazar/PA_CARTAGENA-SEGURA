package com.cartagena.segura.backend.service;

import com.cartagena.segura.backend.model.LogEntry;
import com.cartagena.segura.backend.repository.LogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class LogService {

    @Autowired
    private LogRepository logRepository;

    public LogEntry createLog(String action, String user, String details) {
        LogEntry log = new LogEntry(action, user, details);
        return logRepository.save(log);
    }

    public List<LogEntry> getAllLogs() {
        return logRepository.findAll();
    }
}
