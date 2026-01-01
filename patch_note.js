/**
 * [File: patch_note.js]
 * 패치노트 UI 및 관리자 기능 (작성/삭제) 포함
 */

// 1. 모달 HTML (입력 폼 포함)
const patchNoteModalHTML = `
<div class="modal fade" id="patchNoteModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content">
      <div class="modal-header bg-dark text-white d-flex justify-content-between align-items-center">
        <div>
            <h5 class="modal-title m-0">🚀 업데이트 히스토리</h5>
        </div>
        <div class="d-flex gap-2">
            <button id="btnShowWrite" class="btn btn-sm btn-outline-light hidden" onclick="toggleWriteForm()">✏️ 작성</button>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
        </div>
      </div>
      
      <div class="modal-body p-0">
        <div id="patchWriteForm" class="bg-light p-3 border-bottom hidden">
            <div class="row g-2 mb-2">
                <div class="col-4">
                    <input type="text" id="pnVersion" class="form-control form-control-sm" placeholder="v1.0.0">
                </div>
                <div class="col-5">
                    <input type="date" id="pnDate" class="form-control form-control-sm">
                </div>
                <div class="col-3 d-flex align-items-center">
                    <div class="form-check form-switch small">
                        <input class="form-check-input" type="checkbox" id="pnMajor">
                        <label class="form-check-label" for="pnMajor">Major</label>
                    </div>
                </div>
            </div>
            <input type="text" id="pnTitle" class="form-control form-control-sm mb-2" placeholder="패치 제목 (예: 급여 연동 기능 추가)">
            <textarea id="pnContent" class="form-control form-control-sm mb-2" rows="4" placeholder="상세 내용 (HTML 태그 사용 가능)&#13;&#10;- 기능 A 추가&#13;&#10;- 버그 B 수정"></textarea>
            <div class="d-grid">
                <button class="btn btn-primary btn-sm" onclick="savePatchNote()">💾 저장 및 배포</button>
            </div>
        </div>

        <div id="patchList" class="list-group list-group-flush">
            </div>
      </div>
      
      <div class="modal-footer bg-light py-1">
        <small class="text-muted me-auto" style="font-size:0.75rem;">지속적으로 발전하는 시스템이 되겠습니다.</small>
        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">닫기</button>
      </div>
    </div>
  </div>
</div>
`;

// HTML 주입
document.body.insertAdjacentHTML('beforeend', patchNoteModalHTML);

// ============================================================
// [로직] 데이터 로드 및 관리
// ============================================================

// 1. 최신 버전 조회 (index.html 하단 표시용)
async function loadCurrentVersion() {
    if (typeof _supabase === 'undefined') return;

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

// 2. 패치노트 모달 열기
async function openPatchModal() {
    const modalEl = document.getElementById('patchNoteModal');
    const modal = new bootstrap.Modal(modalEl);
    
    // 관리자 체크 (localStorage 확인)
    checkAdminPermission();
    
    // 작성 폼 초기화
    document.getElementById("patchWriteForm").classList.add("hidden");
    document.getElementById("pnDate").valueAsDate = new Date(); // 오늘 날짜

    // 리스트 로딩
    await loadPatchList();
    modal.show();
}

// 3. 리스트 불러오기 (재사용 가능하도록 분리)
async function loadPatchList() {
    const listEl = document.getElementById("patchList");
    listEl.innerHTML = '<div class="p-4 text-center"><div class="spinner-border text-primary"></div></div>';

    const { data } = await _supabase
        .from('sys_patch_notes')
        .select('*')
        .order('release_date', { ascending: false })
        .order('id', { ascending: false });
        
    if(!data || data.length === 0) {
        listEl.innerHTML = '<div class="p-4 text-center text-muted">업데이트 내역이 없습니다.</div>';
        return;
    }
    
    // 관리자 여부 재확인 (삭제 버튼 표시용)
    const isAdmin = isAdminUser();

    listEl.innerHTML = data.map(note => {
        // 줄바꿈 처리
        const contentHtml = note.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
        
        // 뱃지 스타일
        const badge = note.is_major 
            ? '<span class="badge bg-danger ms-2">Major Update</span>' 
            : '<span class="badge bg-secondary ms-2">Patch</span>';
        
        // 삭제 버튼 (관리자만 보임)
        const delBtn = isAdmin 
            ? `<button class="btn btn-outline-danger btn-sm py-0 ms-auto" style="font-size:0.7rem;" onclick="deletePatchNote(${note.id})">삭제</button>` 
            : '';

        return `
            <div class="list-group-item p-3">
                <div class="d-flex w-100 align-items-center mb-2">
                    <h6 class="mb-0 fw-bold text-primary">v${note.version} ${badge}</h6>
                    <small class="text-muted ms-2">${note.release_date}</small>
                    ${delBtn}
                </div>
                <h6 class="fw-bold mb-2">${note.title}</h6>
                <p class="mb-1 small text-secondary" style="line-height: 1.6;">${contentHtml}</p>
            </div>
        `;
    }).join("");
}

// 4. 새 패치노트 저장 (관리자용)
async function savePatchNote() {
    const version = document.getElementById("pnVersion").value;
    const date = document.getElementById("pnDate").value;
    const title = document.getElementById("pnTitle").value;
    const content = document.getElementById("pnContent").value;
    const isMajor = document.getElementById("pnMajor").checked;

    if(!version || !title || !content) return alert("내용을 모두 입력해주세요.");

    const { error } = await _supabase.from('sys_patch_notes').insert({
        version: version,
        release_date: date,
        title: title,
        content: content,
        is_major: isMajor
    });

    if(error) {
        alert("저장 실패: " + error.message);
    } else {
        alert("업데이트 되었습니다!");
        // 폼 초기화 및 리스트 갱신
        document.getElementById("pnVersion").value = "";
        document.getElementById("pnTitle").value = "";
        document.getElementById("pnContent").value = "";
        document.getElementById("patchWriteForm").classList.add("hidden");
        await loadPatchList();
        loadCurrentVersion(); // 메인화면 버전 텍스트도 갱신
    }
}

// 5. 패치노트 삭제 (관리자용)
async function deletePatchNote(id) {
    if(!confirm("이 패치 내역을 삭제하시겠습니까?")) return;
    
    const { error } = await _supabase.from('sys_patch_notes').delete().eq('id', id);
    
    if(error) alert("삭제 실패: " + error.message);
    else await loadPatchList();
}

// [Helper] 관리자 권한 체크 및 UI 제어
function checkAdminPermission() {
    const btn = document.getElementById("btnShowWrite");
    if(isAdminUser()) {
        btn.classList.remove("hidden");
    } else {
        btn.classList.add("hidden");
    }
}

function isAdminUser() {
    const userStr = localStorage.getItem('erp_user');
    if(!userStr) return false;
    const user = JSON.parse(userStr);
    // 권한 체크 로직 (국장, 관리자, 이사 등)
    return (user.role === 'admin' || user.position === '국장' || user.position === '이사' || user.position === '이사장');
}

function toggleWriteForm() {
    const form = document.getElementById("patchWriteForm");
    form.classList.toggle("hidden");
}

// 초기 실행
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(loadCurrentVersion, 500);
});
