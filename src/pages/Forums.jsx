import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, ThumbsUp, Plus, Tag, Search, CheckCircle, Send, ChevronDown, ChevronUp, User } from 'lucide-react';
import Button from '../components/Button';
import './Forums.css';

const INITIAL_DISCUSSIONS = [
  {
    id: 'f1',
    title: 'Best practices for learning React hooks as a beginner?',
    author: 'Sarah Jenkins',
    category: 'Programming',
    upvotes: 14,
    solved: true,
    time: '2 hours ago',
    tags: ['React', 'JavaScript', 'Frontend'],
    content: 'I am transitioning from vanilla JS to React. Should I start directly with functional components and hooks or learn class components first?',
    comments: [
      { id: 'c1', author: 'Alex Rivera', text: 'Start directly with Functional Components and hooks (useState, useEffect). Class components are rarely used in modern React codebases.', time: '1 hour ago' },
      { id: 'c2', author: 'Michael Chen', text: 'Agreed! Master useState and useEffect first before diving into custom hooks or context.', time: '45 mins ago' }
    ]
  },
  {
    id: 'f2',
    title: 'How do you structure a UI/UX portfolio with no formal client work?',
    author: 'Alex Rivera',
    category: 'Design',
    upvotes: 9,
    solved: false,
    time: '5 hours ago',
    tags: ['Figma', 'UI/UX', 'Portfolio'],
    content: 'I have done several practice projects and skill swap sessions. How can I present these effectively to hiring managers?',
    comments: [
      { id: 'c3', author: 'Elena Rostova', text: 'Treat your SkillSwap projects as real case studies! Document problem statement, user research, wireframes, and final UI decisions.', time: '3 hours ago' }
    ]
  },
  {
    id: 'f3',
    title: 'Looking for a daily Spanish conversational partner!',
    author: 'Michael Chen',
    category: 'Languages',
    upvotes: 21,
    solved: true,
    time: '1 day ago',
    tags: ['Spanish', 'LanguageExchange', 'Practice'],
    content: 'I am around B1 level in Spanish and can offer Python or Data Analysis tutoring in exchange. Anyone interested in 20-min daily chats?',
    comments: [
      { id: 'c4', author: 'Sarah Jenkins', text: 'I am a native Spanish speaker looking to learn Python! Let us set up a swap request.', time: '18 hours ago' }
    ]
  }
];

export default function Forums() {
  const { user } = useAuth();
  const [posts, setPosts] = useState(INITIAL_DISCUSSIONS);
  const [upvotedPostIds, setUpvotedPostIds] = useState(new Set());
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [replyInput, setReplyInput] = useState('');
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showNewModal, setShowNewModal] = useState(false);
  
  // New post form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Programming');
  const [newTags, setNewTags] = useState('');
  const [newContent, setNewContent] = useState('');

  // Single Upvote Toggle handler (User can only upvote ONCE per post)
  const handleToggleUpvote = (id) => {
    const hasUpvoted = upvotedPostIds.has(id);
    const updatedSet = new Set(upvotedPostIds);

    if (hasUpvoted) {
      updatedSet.delete(id);
      setPosts(posts.map(p => p.id === id ? { ...p, upvotes: p.upvotes - 1 } : p));
    } else {
      updatedSet.add(id);
      setPosts(posts.map(p => p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p));
    }
    setUpvotedPostIds(updatedSet);
  };

  const handleAddReply = (postId) => {
    if (!replyInput.trim()) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: user?.name || 'You',
      text: replyInput.trim(),
      time: 'Just now'
    };

    setPosts(posts.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...(p.comments || []), newComment]
        };
      }
      return p;
    }));

    setReplyInput('');
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPost = {
      id: `f-${Date.now()}`,
      title: newTitle,
      author: user?.name || 'Anonymous',
      category: newCategory,
      upvotes: 1,
      solved: false,
      time: 'Just now',
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      content: newContent,
      comments: []
    };

    setPosts([newPost, ...posts]);
    // Automatically upvote own post
    setUpvotedPostIds(new Set([...upvotedPostIds, newPost.id]));

    setNewTitle('');
    setNewContent('');
    setNewTags('');
    setShowNewModal(false);
  };

  const filteredPosts = posts.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
                          p.content.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="forums-page container fade-in">
      <div className="forums-header">
        <div className="forums-header-title">
          <h1>
            <span className="icon-wrapper-brand"><MessageSquare size={24} /></span>
            <span>Community Forums</span>
          </h1>
          <p className="text-muted">Ask questions, share learning insights, and discuss skill exchanges.</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="btn-new-topic">
          <Plus size={16} /> New Discussion
        </Button>
      </div>

      <div className="forums-controls">
        <div className="forum-search-box glass-panel">
          <Search size={18} className="forum-search-icon" />
          <input 
            type="text" 
            placeholder="Search discussions, topics or tags..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>

        <div className="forum-categories">
          {['All', 'Programming', 'Design', 'Languages', 'Business', 'Music'].map(cat => (
            <button 
              key={cat} 
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="forum-posts-list">
        {filteredPosts.length === 0 ? (
          <div className="glass-panel text-center p-5">
            <p className="text-muted">No discussions found matching your criteria.</p>
          </div>
        ) : (
          filteredPosts.map(post => {
            const isUpvoted = upvotedPostIds.has(post.id);
            const isExpanded = expandedPostId === post.id;
            const commentsCount = post.comments ? post.comments.length : 0;

            return (
              <div key={post.id} className={`forum-post-card glass-panel ${isExpanded ? 'expanded' : ''}`}>
                <div className="upvote-column">
                  <button 
                    className={`upvote-btn ${isUpvoted ? 'upvoted' : ''}`} 
                    onClick={() => handleToggleUpvote(post.id)}
                    title={isUpvoted ? "Remove Upvote" : "Upvote this topic"}
                  >
                    <ThumbsUp size={16} />
                    <span>{post.upvotes}</span>
                  </button>
                </div>

                <div className="post-main-content">
                  <div className="post-header-meta">
                    <span className="post-category">{post.category}</span>
                    {post.solved && (
                      <span className="post-solved-badge">
                        <CheckCircle size={12} /> Solved
                      </span>
                    )}
                    <span className="post-time">• {post.time} by <strong>{post.author}</strong></span>
                  </div>

                  <h3 className="post-title" onClick={() => setExpandedPostId(isExpanded ? null : post.id)}>
                    {post.title}
                  </h3>
                  <p className="post-snippet">{post.content}</p>

                  <div className="post-footer">
                    <div className="post-tags">
                      {post.tags.map(tag => (
                        <span key={tag} className="tag-pill"><Tag size={10} /> {tag}</span>
                      ))}
                    </div>
                    
                    <button 
                      className={`post-replies-btn ${isExpanded ? 'active' : ''}`}
                      onClick={() => setExpandedPostId(isExpanded ? null : post.id)}
                    >
                      <MessageSquare size={14} /> 
                      <span>{commentsCount} {commentsCount === 1 ? 'Reply' : 'Replies'}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Expanded Replies Thread */}
                  {isExpanded && (
                    <div className="replies-thread-container fade-in">
                      <h4 className="replies-title">Replies & Discussion ({commentsCount})</h4>
                      
                      <div className="comments-list">
                        {commentsCount === 0 ? (
                          <p className="text-muted text-sm italic">No replies yet. Be the first to answer!</p>
                        ) : (
                          post.comments.map(c => (
                            <div key={c.id} className="comment-item">
                              <div className="comment-avatar">
                                <User size={14} />
                              </div>
                              <div className="comment-body">
                                <div className="comment-header">
                                  <strong className="comment-author">{c.author}</strong>
                                  <span className="comment-time">{c.time}</span>
                                </div>
                                <p className="comment-text">{c.text}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Reply Input Form */}
                      <div className="add-reply-box mt-3">
                        <input 
                          type="text" 
                          placeholder="Write a reply..." 
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddReply(post.id);
                            }
                          }}
                          className="reply-input-field"
                        />
                        <Button 
                          onClick={() => handleAddReply(post.id)} 
                          className="btn-send-reply" 
                          disabled={!replyInput.trim()}
                        >
                          <Send size={14} /> Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Topic Modal */}
      {showNewModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content glass-panel glow-border">
            <h2>Start a Discussion</h2>
            <form onSubmit={handleCreatePost}>
              <div className="input-group">
                <label>Title</label>
                <input 
                  type="text" 
                  placeholder="What is your question or topic?" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="input-group">
                <label>Category</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                  <option value="Programming">Programming</option>
                  <option value="Design">Design</option>
                  <option value="Languages">Languages</option>
                  <option value="Business">Business</option>
                  <option value="Music">Music</option>
                </select>
              </div>

              <div className="input-group">
                <label>Tags (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. React, Beginners, Frontend" 
                  value={newTags} 
                  onChange={(e) => setNewTags(e.target.value)} 
                />
              </div>

              <div className="input-group">
                <label>Content</label>
                <textarea 
                  rows={4} 
                  placeholder="Provide context or details..." 
                  value={newContent} 
                  onChange={(e) => setNewContent(e.target.value)} 
                  required 
                />
              </div>

              <div className="modal-actions">
                <Button variant="ghost" type="button" onClick={() => setShowNewModal(false)}>Cancel</Button>
                <Button type="submit">Publish Topic</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
