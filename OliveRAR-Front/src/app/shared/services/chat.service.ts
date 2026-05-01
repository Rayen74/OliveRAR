import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  reply: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  // Calls Spring Boot bridge → Spring Boot calls n8n (avoids CORS)
  private readonly apiUrl = 'http://localhost:8080/api/chat';

  constructor(private readonly http: HttpClient) {}

  sendMessage(message: string, history: ChatMessage[]): Observable<ChatResponse> {
    const payload = {
      message,
      sessionId: this.getSessionId(),
      history: history.map(m => ({ role: m.role, content: m.content }))
    };
    return this.http.post<ChatResponse>(this.apiUrl, payload);
  }

  private getSessionId(): string {
    let id = sessionStorage.getItem('olive_chat_session');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('olive_chat_session', id);
    }
    return id;
  }
}
