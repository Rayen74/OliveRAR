import { Component, OnInit } from '@angular/core';
import { CommunauteApiService, Post } from '../../../shared/services/communaute-api.sevice';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-communaute',
  templateUrl: './communaute.html',
  styleUrls: ['./communaute.css'],
  imports: [FormsModule, CommonModule ]
})
export class CommunauteComponent implements OnInit {

  posts: Post[] = [];

  nouveauPost = {
    titre: '',
    contenu: ''
  };

  nouveauCommentaire: { [key: string]: string } = {};

  constructor(private api: CommunauteApiService) {}

  ngOnInit(): void {
    this.chargerPosts();
  }

  chargerPosts() {
    this.api.getPosts().subscribe(data => {
      this.posts = data;
    });
  }

  publier() {
    if (!this.nouveauPost.titre || !this.nouveauPost.contenu) return;

    this.api.creerPost(this.nouveauPost).subscribe(() => {
      this.nouveauPost = { titre: '', contenu: '' };
      this.chargerPosts();
    });
  }

  liker(id: string) {
    this.api.likePost(id).subscribe(() => this.chargerPosts());
  }

  supprimer(id: string) {
    this.api.supprimerPost(id).subscribe(() => this.chargerPosts());
  }

  commenter(postId: string) {
    const contenu = this.nouveauCommentaire[postId];
    if (!contenu) return;

    this.api.commenter(postId, contenu).subscribe(() => {
      this.nouveauCommentaire[postId] = '';
      this.chargerPosts();
    });
  }
}
