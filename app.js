import questionsData from './questions.js';

// Quiz Application - Professional Quiz Management System
class QuizApp {
    constructor() {
        this.questionsData = null;
        this.allQuestions = [];
        this.currentPage = 0;
        this.questionsPerPage = 15;
        this.userAnswers = {};
        this.isQuizComplete = false;
        this.autoAdvanceDelay = 800;
        
        this.init();
    }

    init() {
        this.loadTheme();
        this.bindEvents();
        this.loadQuestions();
        this.loadProgress();
        this.updateWelcomeScreen();

        // Auto-resume if there is saved progress
        const totalAnswered = Object.keys(this.userAnswers).length;
        if (totalAnswered > 0) {
            if (totalAnswered === this.allQuestions.length) {
                this.showResults();
            } else {
                this.startQuiz();
                // Scroll to the specific unanswered question
                setTimeout(() => {
                    const firstUnanswered = this.allQuestions.find(q => this.userAnswers[q.id] === undefined);
                    if (firstUnanswered) {
                        const el = document.querySelector(`[data-question-id="${firstUnanswered.id}"]`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('quizTheme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('quizTheme', newTheme);
    }

    bindEvents() {
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('startQuizBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('resetProgressBtn').addEventListener('click', () => this.resetProgress());
        document.getElementById('backToHomeBtn').addEventListener('click', () => this.showScreen('welcomeScreen'));
        // Fix: Remove double-binding for prev/next buttons
        // document.getElementById('prevPageBtn').addEventListener('click', () => this.changePage(-1));
        // document.getElementById('nextPageBtn').addEventListener('click', () => this.changePage(1));
        
        document.getElementById('reviewAnswersBtn').addEventListener('click', () => this.showReview());
        document.getElementById('retakeQuizBtn').addEventListener('click', () => this.retakeQuiz());
        document.getElementById('homeFromResultsBtn').addEventListener('click', () => this.showScreen('welcomeScreen'));
        document.getElementById('backToResultsBtn').addEventListener('click', () => this.showScreen('resultsScreen'));
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterReview(e.target.dataset.filter));
        });

        // Keyboard Navigation
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('quizScreen').classList.contains('active')) return;
            if (e.key === 'ArrowRight') this.changePage(1);
            if (e.key === 'ArrowLeft') this.changePage(-1);
        });
    }

    loadQuestions() {
        try {
            this.questionsData = questionsData;
            this.allQuestions = [];
            
            this.questionsData.sections.forEach(section => {
                section.questions.forEach(q => {
                    this.allQuestions.push({ ...q, sectionName: section.sectionName });
                });
            });
            
            document.getElementById('totalQuestions').textContent = this.allQuestions.length;
            document.getElementById('totalSections').textContent = this.questionsData.sections.length;
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showToast('Failed to load questions', 'error');
        }
    }

    loadProgress() {
        const saved = localStorage.getItem('quizProgress');
        if (saved) {
            const data = JSON.parse(saved);
            this.userAnswers = data.answers || {};
            
            // Resume where user left off
            const firstUnansweredIndex = this.allQuestions.findIndex(q => this.userAnswers[q.id] === undefined);
            if (firstUnansweredIndex !== -1) {
                this.currentPage = Math.floor(firstUnansweredIndex / this.questionsPerPage);
            } else if (Object.keys(this.userAnswers).length > 0) {
                 // All answered, go to results or last page
                 this.currentPage = this.getTotalPages() - 1;
            }
        }
    }

    saveProgress() {
        const data = {
            answers: this.userAnswers,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('quizProgress', JSON.stringify(data));
    }

    updateWelcomeScreen() {
        const sectionsList = document.getElementById('sectionsList');
        sectionsList.innerHTML = this.questionsData.sections.map(section => `
            <div class="section-item">
                <div class="section-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                </div>
                <div class="section-info">
                    <div class="section-name">${section.sectionName}</div>
                    <div class="section-count">${section.questions.length} questions</div>
                </div>
            </div>
        `).join('');

        this.showPreviousScores();
    }

    showPreviousScores() {
        const container = document.getElementById('previousScores');
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        
        if (history.length > 0) {
            const last = history[history.length - 1];
            const percentage = Math.round((last.correct / last.total) * 100);
            const date = new Date(last.timestamp).toLocaleDateString();
            
            container.innerHTML = `
                <div class="previous-scores-card">
                    <div class="previous-scores-title">Last Attempt</div>
                    <div class="last-score">
                        <div class="last-score-value">${percentage}%</div>
                        <div class="last-score-details">
                            <div class="last-score-breakdown">${last.correct}/${last.total} correct</div>
                            <div class="last-score-date">${date}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '';
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    startQuiz() {
        this.showScreen('quizScreen');
        this.showScreen('quizScreen');
        // Resume from saved page or current page
        this.renderPage();
        this.updateProgress();
    }

    getTotalPages() {
        return Math.ceil(this.allQuestions.length / this.questionsPerPage);
    }

    getPageQuestions() {
        const start = this.currentPage * this.questionsPerPage;
        const end = start + this.questionsPerPage;
        return this.allQuestions.slice(start, end);
    }

    renderPage() {
        const container = document.getElementById('questionsContainer');
        const questions = this.getPageQuestions();
        const startIndex = this.currentPage * this.questionsPerPage;
        
        container.innerHTML = questions.map((q, i) => {
            const globalIndex = startIndex + i;
            const userAnswer = this.userAnswers[q.id];
            const isAnswered = userAnswer !== undefined;
            const isCorrect = userAnswer === q.correctAnswer;
            
            let cardClass = 'question-card';
            if (isAnswered) {
                cardClass += isCorrect ? ' correct' : ' incorrect';
            }
            
            return `
                <div class="${cardClass}" data-question-id="${q.id}">
                    <div class="question-header">
                        <span class="question-number">${q.id}</span>
                        <p class="question-text">${q.question}</p>
                    </div>
                    <div class="options-list">
                        ${Object.entries(q.options).map(([key, value]) => {
                            let optionClass = 'option-item';
                            if (isAnswered) {
                                optionClass += ' disabled';
                                if (key === q.correctAnswer) optionClass += ' correct';
                                else if (key === userAnswer) optionClass += ' incorrect';
                            } else if (userAnswer === key) {
                                optionClass += ' selected';
                            }
                            
                            return `
                                <div class="${optionClass}" data-option="${key}" data-question-id="${q.id}">
                                    <span class="option-letter">${key}</span>
                                    <span class="option-text">${value}</span>
                                    <span class="option-icon">
                                        ${key === q.correctAnswer ? 
                                            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>' : 
                                            key === userAnswer && key !== q.correctAnswer ?
                                            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' : ''
                                        }
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.option-item:not(.disabled)').forEach(opt => {
            opt.addEventListener('click', (e) => this.handleAnswer(e));
        });

        this.updatePagination();
        this.updateSectionBadge();
        this.updateSectionBadge();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    handleAnswer(e) {
        const option = e.currentTarget;
        const questionId = parseInt(option.dataset.questionId);
        const selectedAnswer = option.dataset.option;
        const question = this.allQuestions.find(q => q.id === questionId);
        
        if (this.userAnswers[questionId] !== undefined) return;
        
        this.userAnswers[questionId] = selectedAnswer;
        this.saveProgress();
        
        const card = document.querySelector(`[data-question-id="${questionId}"].question-card`);
        const isCorrect = selectedAnswer === question.correctAnswer;
        
        card.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        card.querySelectorAll('.option-item').forEach(opt => {
            opt.classList.add('disabled');
            const optKey = opt.dataset.option;
            if (optKey === question.correctAnswer) {
                opt.classList.add('correct');
            } else if (optKey === selectedAnswer && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });
        
        
        this.updateProgress();
        
        const pageQuestions = this.getPageQuestions();
        const allPageAnswered = pageQuestions.every(q => this.userAnswers[q.id] !== undefined);
        
        if (allPageAnswered && this.currentPage < this.getTotalPages() - 1) {
            setTimeout(() => {
                this.changePage(1);
                this.showToast('Page Complete! advancing...', 'success');
            }, 600); // Shorter delay for "jump directly" feel
        } else if (Object.keys(this.userAnswers).length === this.allQuestions.length) {
            setTimeout(() => this.showResults(), this.autoAdvanceDelay);
        } else {
            // Auto-scroll to next unanswered question on the same page
             const nextUnanswered = pageQuestions.find(q => this.userAnswers[q.id] === undefined);
             if (nextUnanswered) {
                 const el = document.querySelector(`[data-question-id="${nextUnanswered.id}"]`);
                 if (el) {
                     setTimeout(() => {
                         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                     }, 400);
                 }
             }
        }
    }

    updateProgress() {
        const answered = Object.keys(this.userAnswers).length;
        const total = this.allQuestions.length;
        const percentage = (answered / total) * 100;
        
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = `${answered}/${total}`;
        
        const correct = Object.entries(this.userAnswers).filter(([id, ans]) => {
            const q = this.allQuestions.find(q => q.id === parseInt(id));
            return q && ans === q.correctAnswer;
        }).length;
        
        document.getElementById('liveCorrect').textContent = correct;
        document.getElementById('liveIncorrect').textContent = answered - correct; // Show incorrect count
        document.getElementById('liveTotal').textContent = answered;
    }

    updatePagination() {
        const totalPages = this.getTotalPages();
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        prevBtn.disabled = this.currentPage === 0;
        nextBtn.disabled = this.currentPage === totalPages - 1;
        
        if (this.currentPage === totalPages - 1) {
            nextBtn.innerHTML = `<span>Finish</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            nextBtn.disabled = false;
            nextBtn.onclick = () => this.showResults();
        } else {
            nextBtn.innerHTML = `<span>Next</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
            nextBtn.onclick = () => this.changePage(1);
        }

        const indicators = document.getElementById('pageIndicators');
        indicators.innerHTML = Array.from({ length: totalPages }, (_, i) => {
            let dotClass = 'page-dot';
            if (i === this.currentPage) dotClass += ' active';
            
            const pageStart = i * this.questionsPerPage;
            const pageEnd = Math.min(pageStart + this.questionsPerPage, this.allQuestions.length);
            const pageQuestions = this.allQuestions.slice(pageStart, pageEnd);
            const allAnswered = pageQuestions.every(q => this.userAnswers[q.id] !== undefined);
            if (allAnswered && i !== this.currentPage) dotClass += ' completed';
            
            return `<div class="${dotClass}" data-page="${i}"></div>`;
        }).join('');

        indicators.querySelectorAll('.page-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this.currentPage = parseInt(dot.dataset.page);
                this.renderPage();
            });
        });
    }

    updateSectionBadge() {
        const questions = this.getPageQuestions();
        if (questions.length > 0) {
            document.getElementById('currentSectionBadge').textContent = questions[0].sectionName;
        }
    }

    changePage(direction) {
        const newPage = this.currentPage + direction;
        if (newPage >= 0 && newPage < this.getTotalPages()) {
            this.currentPage = newPage;
            this.renderPage();
        }
    }

    showResults() {
        this.showScreen('resultsScreen');
        
        const total = this.allQuestions.length;
        let correct = 0;
        
        this.allQuestions.forEach(q => {
            if (this.userAnswers[q.id] === q.correctAnswer) correct++;
        });
        
        const incorrect = total - correct;
        const percentage = Math.round((correct / total) * 100);
        
        document.getElementById('finalCorrect').textContent = correct;
        document.getElementById('finalIncorrect').textContent = incorrect;
        document.getElementById('finalTotal').textContent = total;
        
        const scoreEl = document.getElementById('scorePercentage');
        let displayScore = 0;
        const scoreInterval = setInterval(() => {
            if (displayScore < percentage) {
                displayScore++;
                scoreEl.textContent = displayScore;
            } else {
                clearInterval(scoreInterval);
            }
        }, 20);
        
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (percentage / 100) * circumference;
        setTimeout(() => {
            document.getElementById('scoreRingFill').style.strokeDashoffset = offset;
        }, 100);

        const trophy = document.getElementById('trophyIcon');
        const message = document.getElementById('resultMessage');
        trophy.className = 'trophy-icon';
        
        if (percentage >= 90) {
            trophy.classList.add('excellent');
            message.textContent = 'Excellent! Outstanding performance!';
        } else if (percentage >= 70) {
            trophy.classList.add('good');
            message.textContent = 'Great job! Well done!';
        } else if (percentage >= 50) {
            trophy.classList.add('passing');
            message.textContent = 'Good effort! Keep practicing!';
        } else {
            trophy.classList.add('needs-work');
            message.textContent = 'Keep studying, you\'ll improve!';
        }

        this.renderSectionBreakdown();
        this.saveToHistory(correct, total);
    }

    renderSectionBreakdown() {
        const container = document.getElementById('sectionBreakdown');
        
        const breakdown = this.questionsData.sections.map(section => {
            const sectionQuestions = section.questions;
            const correct = sectionQuestions.filter(q => 
                this.userAnswers[q.id] === q.correctAnswer
            ).length;
            const total = sectionQuestions.length;
            const percentage = Math.round((correct / total) * 100);
            
            return { name: section.sectionName, correct, total, percentage };
        });
        
        container.innerHTML = breakdown.map(s => `
            <div class="breakdown-item">
                <div class="breakdown-name">${s.name}</div>
                <div class="breakdown-score">${s.correct}/${s.total}</div>
                <div class="breakdown-bar">
                    <div class="breakdown-fill" style="width: 0%"></div>
                </div>
            </div>
        `).join('');
        
        setTimeout(() => {
            container.querySelectorAll('.breakdown-fill').forEach((bar, i) => {
                bar.style.width = `${breakdown[i].percentage}%`;
            });
        }, 300);
    }

    saveToHistory(correct, total) {
        const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
        history.push({
            correct,
            total,
            timestamp: new Date().toISOString(),
            answers: { ...this.userAnswers }
        });
        
        if (history.length > 10) history.shift();
        localStorage.setItem('quizHistory', JSON.stringify(history));
    }

    showReview(filter = 'all') {
        this.showScreen('reviewScreen');
        this.renderReview(filter);
    }

    renderReview(filter = 'all') {
        const container = document.getElementById('reviewContainer');
        
        let questions = this.allQuestions.map(q => ({
            ...q,
            userAnswer: this.userAnswers[q.id],
            isCorrect: this.userAnswers[q.id] === q.correctAnswer
        }));
        
        if (filter === 'correct') {
            questions = questions.filter(q => q.isCorrect);
        } else if (filter === 'incorrect') {
            questions = questions.filter(q => !q.isCorrect);
        }
        
        container.innerHTML = questions.map(q => `
            <div class="review-item ${q.isCorrect ? 'correct' : 'incorrect'}">
                <div class="review-question-header">
                    <span class="question-number">${q.id}</span>
                    <span class="review-status-badge ${q.isCorrect ? 'correct' : 'incorrect'}">
                        ${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                    <span class="review-section-badge">${q.sectionName}</span>
                </div>
                <p class="question-text">${q.question}</p>
                <div class="review-answer-info">
                    <div class="answer-block">
                        <span class="answer-label">Your Answer</span>
                        <div class="answer-value ${q.isCorrect ? 'correct' : 'incorrect'}">
                            <strong>${q.userAnswer || 'Not answered'}:</strong> ${q.options[q.userAnswer] || '-'}
                        </div>
                    </div>
                    ${!q.isCorrect ? `
                        <div class="answer-block">
                            <span class="answer-label">Correct Answer</span>
                            <div class="answer-value correct">
                                <strong>${q.correctAnswer}:</strong> ${q.options[q.correctAnswer]}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    filterReview(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderReview(filter);
    }

    retakeQuiz() {
        this.userAnswers = {};
        this.currentPage = 0;
        localStorage.removeItem('quizProgress');
        this.startQuiz();
        this.showToast('Quiz restarted!', 'info');
    }

    resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            this.userAnswers = {};
            localStorage.removeItem('quizProgress');
            localStorage.removeItem('quizHistory');
            this.showPreviousScores();
            this.showToast('Progress reset successfully', 'success');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
            error: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
            info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        `;
        
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});
