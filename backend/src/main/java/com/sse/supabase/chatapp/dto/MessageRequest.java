package com.sse.supabase.chatapp.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MessageRequest {
    private String roomId;
    private String senderId;
    private String nickname;
    private String content;
}