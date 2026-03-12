import { API_BASE_URL } from './constants/api';
import KakaoInputBar from './components/KakaoInputBar';
import { useSwipeable } from 'react-swipeable';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import React, { useState, useEffect, useRef, useMemo } from 'react';
// 1. 컴포넌트가 받을 데이터의 규격을 정의합니다.
interface KakaoChatProps {
  room: {
    id: string;
    title: string;
  };
  profile: {
    id: string;
    nickname: string;
  };
  onExit: () => void; // 방 나가기 함수를 부모로부터 받음
}
interface Message {
  id: any; // UUID나 숫자가 섞일 수 있으므로 any 또는 string | number
  timestamp: string; // 날짜 비교를 위한 필드 추가
  senderId: string;
  sender: string;
  content: string;
  time: string;
  isMe: boolean;
  isRead: boolean;
}

//const KakaoChat = () => {
const KakaoChat: React.FC<KakaoChatProps> = ({ room, profile, onExit }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // 서랍 상태
  const [participants, setParticipants] = useState<string[]>([]); // 참여자 목록

  const [isSearchOpen, setIsSearchOpen] = useState(false);// 검색 관련 상태 추가
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIdx, setCurrentSearchIdx] = useState(-1); // 현재 보고 있는 검색 결과의 순서

  const [messages, setMessages] = useState<Message[]>([]); 
  const scrollRef = useRef<HTMLDivElement>(null); // 스크롤을 위한 Ref 생성
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null); // URL 대신 인덱스로 관리

  const [systemNotice, setSystemNotice] = useState<string | null>(null); 
  const messageRefs = useRef<{[key: string]: HTMLDivElement | null}>({}); // 각 메시지 위치 참조용

  // 서랍이 열릴 때 참여자 목록을 가져오는 함수 
  const fetchParticipants = async () => {
    try {
      // 백엔드에 해당 방의 접속자 명단을 요청하는 API가 있다고 가정
      const response = await fetch(`${API_BASE_URL}/api/chat/rooms/${room.id}/users`);
      if (response.ok) {
        const data = await response.json(); // ['닉네임1', '닉네임2', ...]
        setParticipants(data);
      }
    } catch (error) {
      console.error("참여자 명단 로드 실패:", error);
      // 테스트용 더미 데이터
      setParticipants([profile.nickname, "행복한 무지", "화난 라이언"]);
    }
  };
  useEffect(() => {
    if (isDrawerOpen) {
      fetchParticipants();
    }
  }, [isDrawerOpen]);
  // 검색어와 일치하는 메시지 인덱스 필터링 (메모이제이션)
  const searchIndices = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return messages
      .map((msg, idx) => msg.content.includes(searchQuery) ? idx : -1)
      .filter(idx => idx !== -1);
  }, [searchQuery, messages]);
  // 검색 결과 이동 함수
  const scrollToResult = (resultIdx: number) => {
    const messageIdx = searchIndices[resultIdx];
    const messageId = messages[messageIdx].id;
    const element = messageRefs.current[messageId];

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentSearchIdx(resultIdx);
    }
  };
  // 검색어 입력 시 첫 번째(가장 최근) 결과로 이동
  useEffect(() => {
    if (searchIndices.length > 0) {
      scrollToResult(searchIndices.length - 1); // 가장 최근 메시지부터 보여줌
    } else {
      setCurrentSearchIdx(-1);
    }
  }, [searchIndices]);
  // 채팅창 내의 모든 이미지 URL만 추출
  const chatImages = messages
    .filter(m => m.content.startsWith('http'))
    .map(m => m.content);

  // 외부 URL 이미지 강제 다운로드 함수
  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `kakao_image_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("다운로드 실패:", err);
      window.open(url, '_blank'); // 실패 시 차선책으로 새 창 열기
    }
  };

  // 3. 스와이프 로직
  const handlers = useSwipeable({
    onSwipedLeft: () => nextImage(),
    onSwipedRight: () => prevImage(),
    trackMouse: true
  });

  const nextImage = () => {
    if (selectedIdx !== null && selectedIdx < chatImages.length - 1) {
      setSelectedIdx(selectedIdx + 1);
    }
  };

  const prevImage = () => {
    if (selectedIdx !== null && selectedIdx > 0) {
      setSelectedIdx(selectedIdx - 1);
    }
  };


  // [자동 스크롤] 메시지 목록이 변경될 때마다 하단으로 이동
  const scrollToBottom = () => {
    if (scrollRef.current) {
      // scrollIntoView 보다 정확한 수치 제어
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]); // messages 상태가 바뀔 때마다 실행

  // [과거 내역] 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/history/${room.id}`);
        if (response.ok) {
          const data = await response.json();
          // 가져온 데이터를 포맷에 맞춰 state에 저장
          setMessages(data.map((m: any) => ({
            id: m.id || Math.random(),
            timestamp: m.created_at || m.createdAt, // 원본 타임스탬프 저장
            senderId: m.sender_id || m.senderId, // DB 필드명 대응
            sender: m.profiles?.nickname || '익명',        // 백엔드에서 nickname을 같이 보내줘야 함
            content: m.content,
            time: new Date(m.created_at || m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: String(m.sender_id || m.senderId) === String(profile.id), // ID 비교 강화
            isRead: true
          })));
        }
      } catch (error) {
        console.error("내역 로딩 실패:", error);
      }
    };

    fetchHistory();
  }, [room.id, profile.id]);

  // [수신] SSE 연결 설정
  useEffect(() => {
    if (!room.id || !profile.nickname) return;

    const encodedNick = encodeURIComponent(profile.nickname);

    const eventSource = new EventSource(
      `${API_BASE_URL}/api/chat/subscribe/${room.id}?nickname=${encodedNick}`
    );

    eventSource.addEventListener("chat", (event) => {
      const newMessage = JSON.parse(event.data);
      console.log("받은 채팅:", newMessage);
      
      setMessages((prev) => [...prev, {
        id: Date.now() + Math.random(), // 키 중복 방지
        timestamp: new Date().toISOString(),
        senderId: newMessage.senderId,
        sender: newMessage.nickname || '알 수 없음',
        content: newMessage.content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: String(newMessage.senderId) === String(profile.id),
        isRead: true
      }]);
    });
      
      // 서버에서 온 메시지를 화면 리스트에 추가
    eventSource.addEventListener("system", (event) => {
      console.log("받은 시스템 메시지:", event.data);
      setSystemNotice(event.data);
      //setIsBouncing(true);
  
      // 3초 후 애니메이션 종료 및 알림 숨기기
      const timer = setTimeout(() => {
        //setIsBouncing(false);
        setTimeout(() => setSystemNotice(null), 500); 
      }, 3000);

      return () => clearTimeout(timer);
    });

    eventSource.onerror = (error) => {
      console.error("SSE 연결 에러:", error);
      eventSource.close();
    };

    return () => {
        console.log("채팅방을 나갑니다. 연결을 종료합니다.");
        eventSource.close();

        // [핵심] 서버에 퇴장 사실을 명시적으로 알림
        fetch(`${API_BASE_URL}/api/chat/exit?roomId=${room.id}&nickname=${encodedNick}`, {
          method: 'POST'
        }).catch(err => console.error("퇴장 알림 실패:", err));
      };
  }, [room.id, profile.id, profile.nickname]);

  
  const sendMessageToBackend = async (content: string) => {
    // 방 ID나 프로필 정보가 없으면 전송 중단
    if (!room?.id || !profile?.id) {
      console.error("방 정보 또는 프로필 정보가 없습니다.");
      return;
    }
    
    console.log("전송 시도 데이터:", content); // 이 값이 출력되는지 확인!
    if (!content.trim()) return; 
  
    const messageData = {
      roomId: room.id,
      senderId: profile.id,
      nickname: profile.nickname,
      content: content,
    }; 

    // Spring Boot의 /api/chat/message API를 호출합니다.
    // MessageRequest DTO의 규격에 맞춰 데이터를 전송합니다.
    try {
      const response =await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });
      if (!response.ok) throw new Error("서버 응답 에러");
      
      console.log("전송 성공!");
    } catch (error) {
      console.error("전송 실패:", error);
    }
  };


  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#bacee0] border">
      {/* 헤더 */}
      {!isSearchOpen ? (
        <header className="flex items-center p-3 bg-[#bacee0] border-b border-black/5 z-10">
        <button 
          onClick={onExit} 
          className="mr-3 p-1 hover:bg-black/5 rounded-full transition text-gray-700"
          title="방 나가기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-800 truncate">{room.title}</h2>
          <p className="text-[10px] text-gray-600">접속자: {profile.nickname}</p>
        </div>
        <div className="flex space-x-2 text-gray-600">
          <button onClick={() => setIsSearchOpen(true)} className="p-1">🔍</button>
          <button onClick={() => setIsDrawerOpen(true)} className="p-1">☰</button>
        </div></header>
      )
        : (
        <header className="flex items-center p-2 bg-[#333] z-20 animate-in slide-in-from-top duration-200">
          <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="p-2 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <input 
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="대화내용 검색"
            className="flex-1 bg-transparent text-white text-sm outline-none px-2"
          />
        </header>
      )}
      {/* 서랍 메뉴 */}
      {/* 배경 어둡게 처리 (Overlay) */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* 슬라이드 메뉴 본체 */}
      <div className={`fixed top-0 right-0 h-full w-64 bg-white z-50 shadow-2xl transition-transform duration-300 transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-800">채팅방 정보</h3>
                <button onClick={() => setIsDrawerOpen(false)} className="text-gray-400 text-xl">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <p className="text-xs text-gray-400 mb-3">대화 상대 ({participants.length})</p>
                <ul className="space-y-4">
                  {participants.map((nick, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center text-[10px] font-bold text-gray-400 border">
                        {nick[0]}
                      </div>
                      <span className="text-sm text-gray-700">{nick}</span>
                      {nick === profile.nickname && <span className="text-[10px] text-yellow-500 font-bold border border-yellow-500 px-1 rounded">나</span>}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 하단 설정 버튼 등 */}
              <div className="border-t pt-4 flex justify-between text-gray-400 text-sm">
                <button className="flex items-center gap-1 hover:text-gray-600">🔔 알림 끔</button>
                <button onClick={onExit} className="flex items-center gap-1 hover:text-red-500">🚪 나가기</button>
              </div>
            </div>
          </div>

      {/* 채팅 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth">
        {messages.map((msg,index) => {
          // 디버깅용: 내 채팅이 안 보인다면 콘솔에서 id를 확인해 보세요.
          // console.log("Comparison:", msg.senderId, profile.id, msg.isMe);
          // 이전 메시지와 날짜 비교 로직
          const isFirstMessage = index === 0;
          const prevMessage = messages[index - 1];

          // 날짜가 바뀌었는지 확인 (YYYY-MM-DD 형식으로 비교)
          const isNewDate = isFirstMessage || (prevMessage && 
            new Date(prevMessage.timestamp).toDateString() !== new Date(msg.timestamp).toDateString());
            
          const isCurrentFocus = searchIndices[currentSearchIdx] === index;

          return (
            <React.Fragment  >
              {isNewDate && (
                <div className="flex justify-center my-4">
                  <div className="bg-black/10 text-white text-[11px] px-4 py-1 rounded-full flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(msg.timestamp).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
                    })}
                  </div>
                </div>
              )}

            <div ref={(el) => {messageRefs.current[msg.id] = el}} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start items-start'}`}>  
              {/* 상대방 메시지일 때만 프로필 노출 (msg.sender가 있을 때만 첫 글자 추출) */}
              {!msg.isMe && (
                <div className="w-10 h-10 bg-white rounded-xl mr-2 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-400 border border-gray-200">
                  {msg.sender ? msg.sender[0] : '익'}
                </div>
              )}

              <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                {/* 상대방 이름 노출 */}
                {!msg.isMe && (
                  <span className="text-[11px] text-gray-700 mb-1 ml-1">{msg.sender || '알 수 없음'}</span>
                )}

                <div className={`flex items-end gap-1 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                  {/* 말풍선 */}
                  <div className={`max-w-[220px] p-2 text-sm shadow-sm
                    ${msg.isMe 
                      ? 'bg-[#ffeb33] rounded-l-lg rounded-br-lg' 
                      : 'bg-white rounded-r-lg rounded-bl-lg'}
                    ${isCurrentFocus ? 'ring-4 ring-orange-400 scale-105' : ''}`}
                  >
                    {msg.content.startsWith('http') ? (
                      <img 
                        src={msg.content} 
                        alt="채팅 이미지" 
                        // 커서를 zoom-in으로 바꾸어 클릭 가능하다는 인상을 줍니다.
                        className="rounded-lg max-w-full cursor-zoom-in hover:opacity-90 transition shadow-inner"
                        onLoad={() => {
                          console.log("이미지 로드 완료 - 스크롤 이동");
                          scrollToBottom();
                        }}
                        onClick={() => {
                          // 전체 이미지 리스트(chatImages)에서 현재 클릭한 이미지의 순서를 찾아 넘겨줍니다.
                          const index = chatImages.indexOf(msg.content);
                          if (index !== -1) setSelectedIdx(index);
                        }}
                      />
                    ) : (
                      // 검색어 하이라이트 로직 적용
                      searchQuery && msg.content.includes(searchQuery) ? (
                        msg.content.split(searchQuery).map((part, i, arr) => (
                          <React.Fragment key={i}>
                            {part}
                            {i !== arr.length - 1 && <span className="bg-orange-300 font-bold">{searchQuery}</span>}
                          </React.Fragment>
                        ))
                      ) : (
                      // 텍스트 메시지 내의 URL은 그대로 텍스트로 출력
                      msg.content
                      )
                    )}
                  </div>
                  
                  {/* 시간 표시 (msg.time이 없을 경우 대비) */}
                  <span className="text-[9px] text-gray-500 whitespace-nowrap mb-0.5">
                    {msg.time || '방금'}
                  </span>
                </div>
              </div>
            </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* 이미지 크게 보기 모달창 */}
      {selectedIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200">
          
          {/* 상단 툴바 */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-black/40 z-10 text-white">
            <button onClick={() => setSelectedIdx(null)} className="p-2">✕</button>
            <span className="text-sm font-bold">{selectedIdx + 1} / {chatImages.length}</span>
            <button onClick={() => handleDownload(chatImages[selectedIdx])} className="p-2">💾</button>
          </div>

          {/* 이미지 영역 (줌 + 스와이프) */}
          <div {...handlers} className="w-full h-full flex items-center justify-center">
            <TransformWrapper
              initialScale={1}
              centerOnInit={true}
              wheel={{ disabled: false }}
            >
              {() => (
                <TransformComponent wrapperClass="!w-full !h-full">
                  <img 
                    src={chatImages[selectedIdx]} 
                    alt="원본" 
                    className="max-w-full max-h-screen object-contain"
                  />
                </TransformComponent>
              )}
            </TransformWrapper>
          </div>

          {/* 좌우 화살표 버튼 (PC 유저용) */}
          {selectedIdx > 0 && (
            <button 
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full text-white text-2xl"
            >
              ‹
            </button>
          )}
          {selectedIdx < chatImages.length - 1 && (
            <button 
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 rounded-full text-white text-2xl"
            >
              ›
            </button>
          )}
        </div>
      )}

      {/* 시스템 알림 영역 (조건부 렌더링) */}
      {systemNotice && (
        
            <div className="mx-2 mb-2 bg-white p-2 rounded shadow-md border flex items-center justify-between animate-bounce">
             <div className="flex items-center space-x-2 overflow-hidden">
                <div className="flex items-center space-x-2 overflow-hidden">
                  <div className="w-6 h-6 bg-yellow-400 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]">
                    🔔
                  </div>
                  <div className="text-xs truncate">
                    <span className="font-bold text-gray-700">{systemNotice}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
 
      {/* 분리된 입력 바 컴포넌트 */}
      {isSearchOpen && searchIndices.length > 0 && (
        <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-30">
        <button 
          onClick={() => currentSearchIdx > 0 && scrollToResult(currentSearchIdx - 1)}
          className="w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-black/80 transition"
        >
          ▲
        </button>
        <button 
          onClick={() => currentSearchIdx < searchIndices.length - 1 && scrollToResult(currentSearchIdx + 1)}
          className="w-10 h-10 bg-black/60 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-black/80 transition"
        >
          ▼
        </button>
      </div>
    )}
      <KakaoInputBar onSend={sendMessageToBackend} />
    </div>
  );
};

export default KakaoChat;