package com.sse.supabase.chatapp.service;

import com.sse.supabase.chatapp.dto.MessageRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Service
public class SupabaseService {

    private final WebClient webClient;

    public SupabaseService(@Value("${supabase.url}") String url, @Value("${supabase.key}") String key) {
        System.out.println("URL: " + url);
        this.webClient = WebClient.builder()
                .baseUrl(url + "/rest/v1")
                .defaultHeader("apikey", key)
                .defaultHeader("Authorization", "Bearer " + key)
                .build();
    }

    /**
     * 메시지를 Supabase DB에 저장 (POST)
     */
    public void saveMessage(MessageRequest request) {
        webClient.post()
                .uri("/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "room_id", request.getRoomId(),
                        "sender_id", request.getSenderId(),
                        "content", request.getContent()
                ))
                .retrieve()
                .onStatus(status -> status.isError(), response ->
                        response.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    System.err.println("Supabase 에러 응답: " + errorBody);
                                    return Mono.error(new RuntimeException("Supabase API 호출 실패: " + errorBody));
                                })
                )
                .bodyToMono(Void.class)
                .subscribe(); // 비동기 실행
    }

    /**
     * 특정 방의 과거 메시지 내역 조회 (GET)
     */
    public Mono<List<Map>> getMessagesByRoomId(String roomId) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/messages")
                        .queryParam("room_id", "eq." + roomId)
                        .queryParam("select", "*, profiles(nickname)")
                        .queryParam("order", "created_at.asc")
                        .build())
                .retrieve()
                .onStatus(status -> status.isError(), response ->
                        response.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    System.err.println("Supabase 에러 응답: " + errorBody);
                                    return Mono.error(new RuntimeException("Supabase API 호출 실패: " + errorBody));
                                })
                )
                .bodyToFlux(Map.class)
                .collectList();
    }
    public Mono<List<Map>> findAllRooms() {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/chat_rooms")
                        .queryParam("select", "*") // 모든 컬럼 선택
                        .queryParam("order", "created_at.desc") // 최신순 정렬
                        .build())
                .retrieve()
                .onStatus(status -> status.isError(), response ->
                        response.bodyToMono(String.class).flatMap(error -> {
                            System.err.println("방 목록 조회 실패: " + error);
                            return Mono.error(new RuntimeException("방 목록을 가져올 수 없습니다."));
                        })
                )
                .bodyToFlux(Map.class) // 여러 개의 결과(Flux)를 Map 형태로 받음
                .collectList(); // Flux를 List로 변환하여 Mono에 담음
    }
    /**
     * 생성된 프로필을 DB에 저장 (POST)
     */
    public Mono<Map> saveProfile(String id, String nickname) {
        return webClient.post()
                .uri("/profiles")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of(
                        "id", id,
                        "nickname", nickname
                ))
                .retrieve()
                .onStatus(status -> status.isError(), response ->
                        response.bodyToMono(String.class).flatMap(error -> {
                            System.err.println("프로필 조회 실패: " + error);
                            return Mono.error(new RuntimeException("프로필을 가져올 수 없습니다."));
                        })
                )
                .bodyToMono(Map.class);
    }
}