package com.sse.supabase.chatapp.controller;

import com.sse.supabase.chatapp.dto.MessageRequest;
import com.sse.supabase.chatapp.service.ChatService;
import com.sse.supabase.chatapp.service.SupabaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.http.MediaType;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
//@CrossOrigin(origins = "http://localhost:5173")
public class ChatController {
    private final ChatService chatService;
    private final SupabaseService supabaseService;
    // private final SupabaseService supabaseService; // Supabase 저장 로직 포함 가정

    @PostMapping("/message")
    public ResponseEntity<Void> sendMessage(@RequestBody MessageRequest request) {
        // 1. Supabase DB에 메시지 저장 (직접 혹은 Repository 이용)
        supabaseService.saveMessage(request);

        // 2. SSE를 통해 해당 방의 모든 클라이언트에게 메시지 전송
        chatService.broadcast(request.getRoomId(), request);

        return ResponseEntity.ok().build();
    }
    @GetMapping("/history/{roomId}")
    public ResponseEntity<List<Map>> getChatHistory(@PathVariable String roomId) {
        // DB에서 과거 내역 조회 후 반환
        List<Map> history = supabaseService.getMessagesByRoomId(roomId).block();
        return ResponseEntity.ok(history);
    }
    @GetMapping(value = "/subscribe/{roomId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable String roomId) {
        return chatService.subscribe(roomId);
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<Map>> getRooms() {
        return ResponseEntity.ok(supabaseService.findAllRooms().block());
    }
}