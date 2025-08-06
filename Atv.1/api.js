const API_BASE_URL = 'https://rickandmortyapi.com/api';
const CHARACTERS_PER_PAGE = 20;

class AppState {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.characters = [];
        this.favorites = this.loadFavorites();
        this.currentTab = 'characters';
        this.searchTerm = '';
        this.statusFilter = '';
        this.speciesFilter = '';
        this.isLoading = false;
    }

    loadFavorites() {
        const saved = localStorage.getItem('rickAndMortyFavorites');
        return saved ? JSON.parse(saved) : [];
    }

    saveFavorites() {
        localStorage.setItem('rickAndMortyFavorites', JSON.stringify(this.favorites));
    }

    addFavorite(character) {
        if (!this.favorites.find(fav => fav.id === character.id)) {
            this.favorites.push(character);
            this.saveFavorites();
            this.updateFavoritesCount();
            return true;
        }
        return false;
    }

    removeFavorite(characterId) {
        this.favorites = this.favorites.filter(fav => fav.id !== characterId);
        this.saveFavorites();
        this.updateFavoritesCount();
    }

    isFavorite(characterId) {
        return this.favorites.some(fav => fav.id === characterId);
    }

    updateFavoritesCount() {
        const countElement = document.querySelector('.favorites-count');
        if (countElement) {
            countElement.textContent = this.favorites.length;
        }
    }
}

class RickAndMortyApp {
    constructor() {
        this.state = new AppState();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCharacters();
        this.state.updateFavoritesCount();
        this.showTab('characters');
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = e.currentTarget.dataset.tab;
                this.showTab(tab);
            });
        });

        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.state.searchTerm = searchInput.value;
                this.state.currentPage = 1;
                this.loadCharacters();
            }, 300));
        }

        const clearSearch = document.getElementById('clearSearch');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                searchInput.value = '';
                this.state.searchTerm = '';
                this.state.currentPage = 1;
                this.loadCharacters();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        const speciesFilter = document.getElementById('speciesFilter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.state.statusFilter = statusFilter.value;
                this.state.currentPage = 1;
                this.loadCharacters();
            });
        }

        if (speciesFilter) {
            speciesFilter.addEventListener('change', () => {
                this.state.speciesFilter = speciesFilter.value;
                this.state.currentPage = 1;
                this.loadCharacters();
            });
        }

        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');
        
        if (prevPage) {
            prevPage.addEventListener('click', () => {
                if (this.state.currentPage > 1) {
                    this.state.currentPage--;
                    this.loadCharacters();
                }
            });
        }

        if (nextPage) {
            nextPage.addEventListener('click', () => {
                if (this.state.currentPage < this.state.totalPages) {
                    this.state.currentPage++;
                    this.loadCharacters();
                }
            });
        }

        const modalOverlay = document.getElementById('modalOverlay');
        const modalClose = document.getElementById('modalClose');
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', () => this.closeModal());
        }
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    async loadCharacters() {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: this.state.currentPage,
                ...(this.state.searchTerm && { name: this.state.searchTerm }),
                ...(this.state.statusFilter && { status: this.state.statusFilter }),
                ...(this.state.speciesFilter && { species: this.state.speciesFilter })
            });

            const response = await fetch(`${API_BASE_URL}/character/?${params}`);
            
            if (!response.ok) {
                throw new Error('Não foi possível carregar os personagens');
            }

            const data = await response.json();
            
            this.state.characters = data.results;
            this.state.totalPages = data.info.pages;
            
            this.renderCharacters();
            this.updatePagination();
            this.updateCharactersCount();
            
        } catch (error) {
            console.error('Erro:', error);
            this.showToast('Ops! Algo deu errado ao carregar os personagens', 'error');
            this.renderError();
        } finally {
            this.showLoading(false);
        }
    }

    renderCharacters() {
        const grid = document.getElementById('charactersGrid');
        if (!grid) return;

        if (this.state.characters.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum personagem encontrado</h3>
                    <p>Tente ajustar os filtros ou digite outro nome</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.state.characters.map(character => this.createCharacterCard(character)).join('');
        
        grid.querySelectorAll('.character-card').forEach((card, index) => {
            const character = this.state.characters[index];
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-btn')) {
                    this.openCharacterModal(character);
                }
            });

            const favoriteBtn = card.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFavorite(character);
                });
            }
        });
    }

    createCharacterCard(character) {
        const isFavorite = this.state.isFavorite(character.id);
        const statusClass = `status-${character.status.toLowerCase()}`;
        
        return `
            <div class="character-card" data-id="${character.id}">
                <img src="${character.image}" alt="${character.name}" class="character-image" loading="lazy">
                <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" aria-label="${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
                    <i class="fas fa-heart"></i>
                </button>
                <div class="character-info">
                    <h3 class="character-name">${character.name}</h3>
                    <div class="character-status">
                        <span class="status-indicator ${statusClass}"></span>
                        <span>${this.capitalizeFirst(character.status)}</span>
                    </div>
                    <p class="character-species">${character.species}</p>
                </div>
            </div>
        `;
    }

    renderFavorites() {
        const grid = document.getElementById('favoritesGrid');
        const emptyState = document.getElementById('emptyFavorites');
        
        if (!grid || !emptyState) return;

        if (this.state.favorites.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        
        grid.innerHTML = this.state.favorites.map(character => this.createCharacterCard(character)).join('');
        
        grid.querySelectorAll('.character-card').forEach((card, index) => {
            const character = this.state.favorites[index];
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.favorite-btn')) {
                    this.openCharacterModal(character);
                }
            });

            const favoriteBtn = card.querySelector('.favorite-btn');
            if (favoriteBtn) {
                favoriteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFavorite(character);
                });
            }
        });
    }

    toggleFavorite(character) {
        const isFavorite = this.state.isFavorite(character.id);
        
        if (isFavorite) {
            this.state.removeFavorite(character.id);
            this.showToast(`${character.name} foi removido dos seus favoritos`, 'warning');
        } else {
            const added = this.state.addFavorite(character);
            if (added) {
                this.showToast(`${character.name} foi adicionado aos seus favoritos!`, 'success');
            }
        }

        document.querySelectorAll(`[data-id="${character.id}"] .favorite-btn`).forEach(btn => {
            btn.classList.toggle('favorited', !isFavorite);
        });

        if (this.state.currentTab === 'favorites') {
            this.renderFavorites();
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    renderError() {
        const grid = document.getElementById('charactersGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ops! Algo deu errado</h3>
                    <p>Não conseguimos carregar os personagens agora</p>
                    <button onclick="app.loadCharacters()" class="retry-btn">
                        <i class="fas fa-redo"></i> Tentar novamente
                    </button>
                </div>
            `;
        }
    }

    updatePagination() {
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const currentPage = document.getElementById('currentPage');
        const totalPages = document.getElementById('totalPages');

        if (prevBtn) prevBtn.disabled = this.state.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.state.currentPage >= this.state.totalPages;
        if (currentPage) currentPage.textContent = this.state.currentPage;
        if (totalPages) totalPages.textContent = this.state.totalPages;
    }

    updateCharactersCount() {
        const countElement = document.getElementById('charactersCount');
        if (countElement) {
            countElement.textContent = this.state.characters.length;
        }
    }

    showTab(tabName) {
        this.state.currentTab = tabName;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === tabName);
        });

        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('active', section.id === tabName);
        });

        if (tabName === 'favorites') {
            this.renderFavorites();
        } else {
            this.renderCharacters();
        }
    }

    openCharacterModal(character) {
        const modal = document.getElementById('characterModal');
        const detailContainer = document.getElementById('characterDetail');
        
        if (!modal || !detailContainer) return;

        const isFavorite = this.state.isFavorite(character.id);
        
        detailContainer.innerHTML = `
            <div class="character-detail-header">
                <img src="${character.image}" alt="${character.name}" class="character-detail-image">
                <div class="character-detail-info">
                    <h2>${character.name}</h2>
                    <div class="character-detail-status">
                        <span class="status-indicator status-${character.status.toLowerCase()}"></span>
                        <span>${this.capitalizeFirst(character.status)}</span>
                    </div>
                    <p class="character-detail-species">${character.species}</p>
                    <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" onclick="app.toggleFavorite(${JSON.stringify(character).replace(/"/g, '&quot;')})">
                        <i class="fas fa-heart"></i>
                        ${isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                    </button>
                </div>
            </div>
            
            <div class="character-detail-section">
                <h3>Informações Gerais</h3>
                <p><strong>Gênero:</strong> ${this.capitalizeFirst(character.gender)}</p>
                <p><strong>Origem:</strong> ${character.origin.name}</p>
                <p><strong>Localização:</strong> ${character.location.name}</p>
            </div>
            
            <div class="character-detail-section">
                <h3>Aparições</h3>
                <p>Este personagem aparece em ${character.episode.length} episódio(s)</p>
            </div>
            
            <div class="character-detail-section">
                <h3>Data de Criação</h3>
                <p>${new Date(character.created).toLocaleDateString('pt-BR')}</p>
            </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        const modal = document.getElementById('characterModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new RickAndMortyApp();
});

const dynamicStyles = `
    .empty-state, .error-state {
        text-align: center;
        padding: 3rem;
        color: var(--gray-600);
        grid-column: 1 / -1;
    }

    .empty-state i, .error-state i {
        font-size: 3rem;
        color: var(--gray-400);
        margin-bottom: 1rem;
    }

    .empty-state h3, .error-state h3 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
        color: var(--gray-700);
    }

    .retry-btn {
        background: var(--accent-color);
        color: var(--white);
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-weight: 500;
        margin-top: 1rem;
        transition: var(--transition);
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
    }

    .retry-btn:hover {
        background: var(--primary-color);
    }

    .character-detail .favorite-btn {
        position: static;
        margin-top: 1rem;
        width: auto;
        height: auto;
        padding: 0.75rem 1.5rem;
        border-radius: var(--border-radius);
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet); 