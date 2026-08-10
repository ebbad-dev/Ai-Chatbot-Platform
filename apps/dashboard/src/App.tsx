import { useState, useEffect } from 'react';
import {
  type UnansweredQuestion,
  UnansweredQuestionStatus,
  ResolutionType,
  type Faq,
  FaqStatus,
  type DashboardStats,
} from './types';
import { apiClient } from './api-client';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'unanswered' | 'faqs'>('unanswered');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [unansweredList, setUnansweredList] = useState<UnansweredQuestion[]>([]);
  const [faqList, setFaqList] = useState<Faq[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // --- Modal Training Drawer State ---
  const [trainingQuestion, setTrainingQuestion] = useState<UnansweredQuestion | null>(null);
  const [answerInput, setAnswerInput] = useState('');
  const [sourceUrlInput, setSourceUrlInput] = useState('https://printez.com/help');
  const [approvedByInput, setApprovedByInput] = useState('Print Specialist (Staff Admin)');

  // --- New Manual FAQ Creation State ---
  const [isCreatingManualFaq, setIsCreatingManualFaq] = useState(false);
  const [manualQuestion, setManualQuestion] = useState('');

  const loadData = async () => {
    const fetchedStats = await apiClient.getDashboardStats();
    const fetchedUnanswered = await apiClient.getUnansweredQuestions();
    const fetchedFaqs = await apiClient.getFaqs();
    setStats(fetchedStats);
    setUnansweredList(fetchedUnanswered);
    setFaqList(fetchedFaqs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismiss = async (id: string) => {
    await apiClient.resolveQuestion(id, { resolutionType: ResolutionType.OUT_OF_SCOPE });
    loadData();
  };

  const handleOpenTrainingModal = (question: UnansweredQuestion) => {
    setTrainingQuestion(question);
    setAnswerInput('');
    setSourceUrlInput('https://printez.com/knowledge');
    setIsCreatingManualFaq(false);
  };

  const handleOpenManualFaqModal = () => {
    setTrainingQuestion(null);
    setManualQuestion('');
    setAnswerInput('');
    setSourceUrlInput('https://printez.com/specifications');
    setIsCreatingManualFaq(true);
  };

  const handleSaveTraining = async () => {
    if (!answerInput.trim()) return;
    if (trainingQuestion) {
      await apiClient.resolveQuestion(trainingQuestion.id, {
        resolutionType: ResolutionType.APPROVED_FAQ,
        createFaqAnswer: answerInput,
        resolvedSourceUrl: sourceUrlInput,
        approvedBy: approvedByInput,
      });
      setTrainingQuestion(null);
    } else if (isCreatingManualFaq) {
      // Simulate manual FAQ insertion via resolution of custom synthetic item
      const customId = `syn-${Date.now()}`;
      await apiClient.resolveQuestion(customId, {
        resolutionType: ResolutionType.APPROVED_FAQ,
        createFaqAnswer: answerInput,
        resolvedSourceUrl: sourceUrlInput,
        approvedBy: approvedByInput,
      });
      // Directly inject manual question title into latest FAQ in mock state
      loadData();
      setIsCreatingManualFaq(false);
    }
    loadData();
  };

  const handleToggleFaq = async (id: string) => {
    await apiClient.toggleFaqStatus(id);
    loadData();
  };

  const handleDeleteFaq = async (id: string) => {
    await apiClient.deleteFaq(id);
    loadData();
  };

  const filteredUnanswered = unansweredList.filter((q) =>
    q.questionText.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredFaqs = faqList.filter((f) =>
    f.question.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.answer.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="app-container">
      {/* --- Sidebar Navigation --- */}
      <aside className="sidebar">
        <div className="brand-header">
          <div className="brand-logo-badge">EZ</div>
          <div>
            <div className="brand-title">PrintEZ AI Staff</div>
            <div className="brand-subtitle">KNOWLEDGE PORTAL</div>
          </div>
        </div>
        <ul className="nav-list">
          <li>
            <button
              className={`nav-item ${activeTab === 'unanswered' ? 'active' : ''}`}
              onClick={() => { setActiveTab('unanswered'); setSearchFilter(''); }}
            >
              <span>⚡ Unanswered Queue</span>
              {stats && stats.pendingReview > 0 && (
                <span className="nav-badge">{stats.pendingReview}</span>
              )}
            </button>
          </li>
          <li>
            <button
              className={`nav-item ${activeTab === 'faqs' ? 'active' : ''}`}
              onClick={() => { setActiveTab('faqs'); setSearchFilter(''); }}
            >
              <span>📚 AI Grounding FAQs</span>
              {stats && <span className="count-chip" style={{ fontSize: 11, background: 'hsla(220, 35%, 25%, 0.8)' }}>{stats.totalApprovedFaqs}</span>}
            </button>
          </li>
        </ul>
      </aside>

      {/* --- Main Dashboard Area --- */}
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h1>{activeTab === 'unanswered' ? 'Unanswered Questions Queue' : 'AI Grounding FAQ Repository'}</h1>
            <p>
              {activeTab === 'unanswered'
                ? 'Review inquiries the AI chatbot could not answer. Train authoritative answers to enhance factual grounding.'
                : 'Manage active FAQs and specifications verified by PrintEZ staff specialists.'}
            </p>
          </div>
          {activeTab === 'faqs' && (
            <button className="btn-primary" onClick={handleOpenManualFaqModal}>
              + Add Custom FAQ
            </button>
          )}
        </div>

        {/* --- Telemetry KPIs --- */}
        {stats && (
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Pending Staff Reviews</div>
              <div className="kpi-value">
                {stats.pendingReview}
                <span className="kpi-subtext">inquiries waiting</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">AI Grounding Score</div>
              <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>
                {stats.aiResolutionScore}%
                <span className="kpi-subtext" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>verified accuracy</span>
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Active AI FAQ Rules</div>
              <div className="kpi-value">
                {stats.totalApprovedFaqs}
                <span className="kpi-subtext" style={{ color: 'var(--accent-indigo)' }}>trained in brain</span>
              </div>
            </div>
          </div>
        )}

        {/* --- Data Table Content Box --- */}
        <div className="content-box">
          <div className="box-toolbar">
            <input
              type="text"
              className="search-input"
              placeholder={activeTab === 'unanswered' ? 'Search customer questions or keywords...' : 'Search FAQ topics or answers...'}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing <strong>{activeTab === 'unanswered' ? filteredUnanswered.length : filteredFaqs.length}</strong> records
            </div>
          </div>

          {activeTab === 'unanswered' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Customer Inquiry Text</th>
                  <th>Occurrences</th>
                  <th>Last Asked</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Staff Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnanswered.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.questionText}</td>
                    <td>
                      <span className="count-chip">{item.occurrenceCount}× asked</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {new Date(item.lastAskedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge badge-${item.status}`}>
                        {item.status === UnansweredQuestionStatus.NEW ? '🔥 Needs Answer' : item.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.status === UnansweredQuestionStatus.NEW ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: 13 }}
                            onClick={() => handleOpenTrainingModal(item)}
                          >
                            ✨ Train AI
                          </button>
                          <button
                            className="btn-ghost btn-danger"
                            style={{ padding: '6px 12px', fontSize: 13 }}
                            onClick={() => handleDismiss(item.id)}
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredUnanswered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No matching unanswered inquiries found. Excellent grounding coverage!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Question / Prompt Topic</th>
                  <th style={{ width: '40%' }}>Verified Grounding Answer</th>
                  <th>Approved By</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaqs.map((faq) => (
                  <tr key={faq.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{faq.question}</td>
                    <td style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{faq.answer}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{faq.approvedBy}</td>
                    <td>
                      <span className={`badge badge-${faq.status}`}>
                        {faq.status === FaqStatus.ACTIVE ? '✅ Active' : '⏸️ Archived'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn-ghost"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => handleToggleFaq(faq.id)}
                        >
                          {faq.status === FaqStatus.ACTIVE ? 'Archive' : 'Activate'}
                        </button>
                        <button
                          className="btn-ghost btn-danger"
                          style={{ padding: '5px 10px', fontSize: 12 }}
                          onClick={() => handleDeleteFaq(faq.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* --- Slide-Over Training Modal Drawer --- */}
      {(trainingQuestion || isCreatingManualFaq) && (
        <div className="modal-overlay" onClick={() => { setTrainingQuestion(null); setIsCreatingManualFaq(false); }}>
          <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h2>{isCreatingManualFaq ? 'Create Custom FAQ' : 'Train AI Knowledge Brain'}</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {isCreatingManualFaq
                    ? 'Directly inject authoritative rules into the chatbot grounding index.'
                    : 'Convert customer question into verified knowledge for instant RAG responses.'}
                </div>
              </div>
              <button
                className="btn-ghost"
                onClick={() => { setTrainingQuestion(null); setIsCreatingManualFaq(false); }}
                style={{ fontSize: 20 }}
              >
                ✕
              </button>
            </div>

            <div className="drawer-body">
              {trainingQuestion ? (
                <div className="field-group">
                  <label className="field-label">Customer Inquiry ({trainingQuestion.occurrenceCount}× occurrences)</label>
                  <div className="question-preview-card">{trainingQuestion.questionText}</div>
                </div>
              ) : (
                <div className="field-group">
                  <label className="field-label">Question / Topic Keyword</label>
                  <input
                    type="text"
                    className="text-input"
                    placeholder="e.g. What printing methods are available for luxury business cards?"
                    value={manualQuestion}
                    onChange={(e) => setManualQuestion(e.target.value)}
                  />
                </div>
              )}

              <div className="field-group">
                <label className="field-label">Authoritative Staff Answer</label>
                <textarea
                  className="textarea-input"
                  placeholder="Enter detailed specifications, pricing rules, or policy explanations. The AI will cite this response directly to customers..."
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Reference Documentation URL (Optional Citation)</label>
                <input
                  type="text"
                  className="text-input"
                  value={sourceUrlInput}
                  onChange={(e) => setSourceUrlInput(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Approved By (Print Specialist Signature)</label>
                <input
                  type="text"
                  className="text-input"
                  value={approvedByInput}
                  onChange={(e) => setApprovedByInput(e.target.value)}
                />
              </div>
            </div>

            <div className="drawer-footer">
              <button
                className="btn-ghost"
                onClick={() => { setTrainingQuestion(null); setIsCreatingManualFaq(false); }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveTraining}
                disabled={!answerInput.trim()}
                style={{ opacity: !answerInput.trim() ? 0.5 : 1 }}
              >
                ✨ Approve & Train AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;