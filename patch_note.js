/**
 * [File: patch_note.js]
 * 패치노트 모달 UI 생성 및 데이터 연동 로직
 * (이 파일은 index.html의 </body> 직전에 불러오세요)
 */

// 1. 모달 HTML 코드를 자바스크립트로 주입 (유지보수 편의성)
const patchNoteModalHTML = `
<div class="modal fade" id="patchNoteModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header bg-dark text-white">
        <h5 class="modal-title">🚀 업데이트 히스토리</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body p-0">
        <div id="patchList" class="list-group list-group-flush">
            </div>
      </div>
      <div class="modal-footer bg-light">
        <small class="text-muted me-auto">지속적으로 발전하는 시스템이 되겠습니다.</small>
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">닫기</button>
      </div>
    </div>
  </div>
</div>
`;

// HTML을 body 맨 끝에 추가
document.body.insertAdjacentHTML('beforeend', patchNoteModalHTML);


// 2. 관련 함수들 이동
// (주의: index.html에 있는 _supabase 변수를 가져다 씁니다)

// 최신 버전 조회 및 표시
async function loadCurrentVersion() {
    // _supabase가 로드되었는지 확인
    if (typeof _supabase === 'undefined') {
        console.error("Supabase client not initialized.");
        return;
    }

    const { data } = await _supabase
        .from('sys_patch_notes')
        .select('version')
        .order('release_date', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
        .single();
        
    if(data) {
        const verEl = document.getElementById("currentVersion");
        if(verEl) verEl.innerText = data.version;
    }
}

// 패치노트 모달 열기
async function openPatchModal() {
    const modalEl = document.getElementById('patchNoteModal');
    if (!modalEl) return alert("패치노트 모달이 로드되지 않았습니다.");

    const modal = new bootstrap.Modal(modalEl);
    const listEl = document.getElementById("patchList");
    
    listEl.innerHTML = '<div class="p-4 text-center"><div class="spinner-border text-primary"></div></div>';
    modal.show();
    
    const { data } = await _supabase
        .from('sys_patch_notes')
        .select('*')
        .order('release_date', { ascending: false })
        .order('id', { ascending: false });
        
    if(!data || data.length === 0) {
        listEl.innerHTML = '<div class="p-4 text-center text-muted">업데이트 내역이 없습니다.</div>';
        return;
    }
    
    listEl.innerHTML = data.map(note => {
        const contentHtml = note.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
        const badge = note.is_major 
            ? '<span class="badge bg-danger ms-2">Major Update</span>' 
            : '<span class="badge bg-secondary ms-2">Patch</span>';
            
        return `
            <div class="list-group-item p-3">
                <div class="d-flex w-100 justify-content-between align-items-center mb-2">
                    <h6 class="mb-0 fw-bold text-primary">v${note.version} ${badge}</h6>
                    <small class="text-muted">${note.release_date}</small>
                </div>
                <h6 class="fw-bold mb-2">${note.title}</h6>
                <p class="mb-1 small text-secondary" style="line-height: 1.5;">${contentHtml}</p>
            </div>
        `;
    }).join("");
}

// 자동 실행 (페이지 로드 시 버전 확인)
document.addEventListener("DOMContentLoaded", function() {
    // 약간의 딜레이를 주어 index.html의 supabase 초기화 후 실행되도록 함
    setTimeout(loadCurrentVersion, 100);
});
