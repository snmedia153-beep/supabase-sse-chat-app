package com.sse.supabase.chatapp.controller;

import com.sse.supabase.chatapp.service.SupabaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/profiles")
public class ProfileController {
    private final SupabaseService supabaseService;
    /*
    @GetMapping("/random")
    public ResponseEntity<Map<String, String>> createRandomProfile() {
        String[] nicknames = {"즐거운 어피치", "화난 라이언", "행복한 무지", "신비로운 콘"};
        String randomNick = nicknames[(int)(Math.random() * nicknames.length)] + "_" + (int)(Math.random() * 1000);

        UUID radonUID = UUID.randomUUID();

        // Supabase에 저장 후 저장된 객체 반환 (생략된 saveProfile 로직)
        Map profile = supabaseService.saveProfile(radonUID.toString(),randomNick);

        // 임시 반환 예시
        return ResponseEntity.ok(Map.of("id", radonUID.toString(), "nickname", randomNick));
    }
     */
    @GetMapping("/random")
    public ResponseEntity<Map<String, String>> createRandomProfile() {
        // 1. 랜덤 닉네임 및 ID 생성
        String[] nicknames = {"즐거운 어피치", "화난 라이언", "행복한 무지", "신비로운 콘"};
        String randomNick = nicknames[(int)(Math.random() * nicknames.length)] + "_" + (int)(Math.random() * 1000);
        String randomId = UUID.randomUUID().toString();

        try {
            // 2. Supabase에 저장 (Mono<Map>을 .block()으로 기다림)
            // 저장이 성공해야 다음 줄로 넘어갑니다.
            supabaseService.saveProfile(randomId, randomNick).block();

            // 3. 성공 시 클라이언트에 정보 반환
            return ResponseEntity.ok(Map.of(
                    "id", randomId,
                    "nickname", randomNick
            ));
        } catch (Exception e) {
            // 저장 실패 시 에러 처리
            System.err.println("프로필 저장 중 오류 발생: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
