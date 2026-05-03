// 1. DOM Elemanlarını Seçme
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const typeFilter = document.getElementById('typeFilter');
const yearFilter = document.getElementById('yearFilter');
const movieResult = document.getElementById('movie-result');
const statusContainer = document.getElementById('status-container');
const quickTags = document.querySelectorAll('.quick-tag');

const apiKey = '51139a2'; // API Key

// 2. Güvenlik: XSS (Cross-Site Scripting) Koruması
function escapeHtml(unsafe) {
    if (!unsafe || unsafe === "N/A") return "Bilinmiyor";
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// 3. Durum Yönetimi (Loading, Error, Empty, Success)
function showState(state, message = "") {
    statusContainer.innerHTML = '';
    
    if (state === 'loading') {
        statusContainer.innerHTML = `<div class="status-msg loading-msg">Veriler çekiliyor...</div>`;
        movieResult.style.display = 'none';
    } else if (state === 'error') {
        statusContainer.innerHTML = `<div class="status-msg error-msg">${message}</div>`;
        movieResult.style.display = 'none';
    } else if (state === 'success') {
        movieResult.style.display = 'block';
    } else {
        movieResult.innerHTML = `<div class="empty-state"><p>Keşfetmek için bir film veya dizi arayın.</p></div>`;
        movieResult.style.display = 'block';
    }
}

// 4. Input Temizle (✕) Mantığı
searchInput.addEventListener('input', () => {
    clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    searchInput.focus();
});

// 5. API'den Veri Çekme İşlemi (Core Logic)
async function fetchMovie(movieName, type = '', year = '') {
    showState('loading');

    try {
        let url = `https://www.omdbapi.com/?t=${movieName}&apikey=${apiKey}`;
        if (type) url += `&type=${type}`;
        if (year) url += `&y=${year}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.Response === "False") {
            showState('error', "Aradığınız kriterlerde içerik bulunamadı!");
        } else {
            showState('success');
            displayMovie(data);
            
            // LocalStorage Kaydı
            localStorage.setItem('lastSearchedMovie', movieName);
            localStorage.setItem('lastSearchedType', type);
            localStorage.setItem('lastSearchedYear', year);
        }
    } catch (error) {
        showState('error', "Bir hata oluştu. Bağlantınızı kontrol edin.");
    }
}

// 6. IMDb Renk ve Bar Mantığı
function getRatingColorClass(score) {
    if (score >= 7.5) return 'score-high'; // Yeşil
    if (score >= 5.0) return 'score-mid';  // Sarı
    return 'score-low';                    // Kırmızı
}

function getRatingColorHex(score) {
    if (score >= 7.5) return '#10b981';
    if (score >= 5.0) return '#f59e0b';
    return '#ef4444';
}

// 7. Ekrana Basma (HTML Enjeksiyonu)
function displayMovie(movie) {
    const posterSrc = movie.Poster !== "N/A" ? movie.Poster : 'https://via.placeholder.com/300x450?text=Afis+Yok';
    
    // Verileri XSS'e karşı temizle
    const safeTitle = escapeHtml(movie.Title);
    const safeYear = escapeHtml(movie.Year);
    const safeGenre = escapeHtml(movie.Genre);
    const safeDirector = escapeHtml(movie.Director);
    
    // Puan hesaplamaları
    const imdbScore = movie.imdbRating !== "N/A" ? parseFloat(movie.imdbRating) : 0;
    const scoreColorClass = getRatingColorClass(imdbScore);
    const scoreHex = getRatingColorHex(imdbScore);

    movieResult.innerHTML = `
        <div class="movie-info">
            <img src="${posterSrc}" alt="${safeTitle} Afişi">
            <div class="details">
                <h2>${safeTitle}</h2>
                
                <div class="badge-container">
                    <span class="badge">${safeYear}</span>
                    <span class="badge">${safeGenre}</span>
                    <span class="badge score-badge ${scoreColorClass}">IMDb: ${imdbScore > 0 ? imdbScore : 'N/A'}</span>
                </div>
                
                <p class="director">Yönetmen / Yaratıcı: <span style="color: white;">${safeDirector}</span></p>
                
                <div class="rating-container">
                    <div class="rating-label">
                        <span>İzleyici Skoru</span>
                        <span>%${imdbScore * 10}</span>
                    </div>
                    <div class="progress-bg">
                        <div class="progress-fill" style="width: ${imdbScore * 10}%; background-color: ${scoreHex};"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 8. Olay Dinleyicileri (Event Listeners)
function handleSearch() {
    const movieName = searchInput.value.trim();
    const type = typeFilter.value;
    const year = yearFilter.value.trim();

    if (movieName) {
        fetchMovie(movieName, type, year);
    } else {
        showState('error', "Lütfen bir film veya dizi adı girin.");
    }
}

searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
yearFilter.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });

// Hızlı arama butonlarına tıklanma durumu
quickTags.forEach(tag => {
    tag.addEventListener('click', (e) => {
        const targetMovie = e.target.textContent;
        searchInput.value = targetMovie;
        clearBtn.style.display = 'block'; 
        typeFilter.value = '';
        yearFilter.value = '';
        fetchMovie(targetMovie);
    });
});

// 9. Sayfa Yüklendiğinde LocalStorage'ı Oku
window.onload = () => {
    const lastSearch = localStorage.getItem('lastSearchedMovie');
    const lastType = localStorage.getItem('lastSearchedType');
    const lastYear = localStorage.getItem('lastSearchedYear');

    if (lastSearch) {
        searchInput.value = lastSearch;
        clearBtn.style.display = 'block';
        if (lastType) typeFilter.value = lastType;
        if (lastYear) yearFilter.value = lastYear;
        fetchMovie(lastSearch, lastType || '', lastYear || '');
    } else {
        showState('empty');
    }
};