import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css'
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  isOpen = false;
  isTyping = false;
  userInput = '';
  messages: ChatMessage[] = [];
  currentUserName = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUserName = user ? user.prenom : 'vous';
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen && this.messages.length === 0) {
      this.addAssistantMessage(
        `Bonjour ${this.currentUserName} ! 👋 Je suis votre assistant OliveRAR. Comment puis-je vous aider aujourd'hui ?`
      );
    }
    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isTyping) return;

    this.messages.push({ role: 'user', content: text, timestamp: new Date() });
    this.userInput = '';
    this.isTyping = true;
    this.cdr.detectChanges();
    this.scrollToBottom();

    this.chatService.sendMessage(text, this.messages.slice(0, -1))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.addAssistantMessage(res.reply);
          this.isTyping = false;
          this.cdr.detectChanges();
          this.scrollToBottom();
        },
        error: () => {
          this.addAssistantMessage("Désolé, une erreur s'est produite. Veuillez réessayer.");
          this.isTyping = false;
          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private addAssistantMessage(content: string): void {
    this.messages.push({ role: 'assistant', content, timestamp: new Date() });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
