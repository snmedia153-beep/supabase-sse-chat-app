package com.sse.supabase.chatapp.service;

import com.sse.supabase.chatapp.dto.MessageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ChatService {
    // 방 ID별로 연결된 Emitter 목록을 관리 (실제 운영 시에는 Redis 등을 고려해야 함)
    private final Map<String, List<SseEmitter>> roomEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String roomId) {
        SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
        roomEmitters.computeIfAbsent(roomId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> roomEmitters.get(roomId).remove(emitter));
        emitter.onTimeout(() -> roomEmitters.get(roomId).remove(emitter));

        return emitter;
    }

    public void broadcast(String roomId, MessageRequest message) {
        List<SseEmitter> emitters = roomEmitters.get(roomId);
        if (emitters != null) {
            emitters.forEach(emitter -> {
                try {
                    emitter.send(SseEmitter.event().name("chat").data(message));
                } catch (IOException e) {
                    emitters.remove(emitter);
                }
            });
        }
    }
}