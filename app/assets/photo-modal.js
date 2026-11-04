// Variáveis globais para o modal de foto
let currentPhotoFile = null;
let cameraStream = null;
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Configuração para reload - pode ser alterada conforme necessário
const PHOTO_UPDATE_CONFIG = {
    usePageReload: false, // true = recarrega página completa, false = apenas atualiza a foto
    reloadDelay: 2000 // delay em ms antes de recarregar (apenas se usePageReload = true)
};

// Função para abrir o modal
function openPhotoModal() {
    document.getElementById('photoModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Previne scroll do body
    resetModalState();
}

// Função para fechar o modal
function closePhotoModal() {
    document.getElementById('photoModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // Restaura scroll do body
    stopCamera();
    resetModalState();
}

// Função para resetar o estado do modal
function resetModalState() {
    currentPhotoFile = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('cameraContainer').style.display = 'none';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('savePhotoBtn').disabled = true;
    
    // Garantir que os botões de ação sejam exibidos
    const actionsDiv = document.querySelector('.photo-modal-actions');
    actionsDiv.style.display = 'flex';
    
    // Garantir que ambos os botões sejam visíveis
    const btnUpload = actionsDiv.querySelector('.btn-upload');
    const btnTakePhoto = actionsDiv.querySelector('.btn-take-photo');
    btnUpload.style.display = 'inline-block';
    btnTakePhoto.style.display = 'inline-block';
    
    // Remove classes de erro
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(msg => msg.remove());
}

// Função para lidar com seleção de arquivo
function handleFileSelect(file) {
    if (!file) return;
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
        showError('Por favor, selecione apenas arquivos de imagem.');
        return;
    }
    
    // Validar tamanho do arquivo (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showError('O arquivo deve ter no máximo 5MB.');
        return;
    }
    
    currentPhotoFile = file;
    
    // Mostrar preview
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('cameraContainer').style.display = 'none';
        document.getElementById('savePhotoBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}

// Função para remover a imagem selecionada
function removeImage() {
    currentPhotoFile = null;
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('dropZone').style.display = 'block';
    document.getElementById('savePhotoBtn').disabled = true;
    
    // Restaurar as opções de upload quando a imagem for removida
    const actionsDiv = document.querySelector('.photo-modal-actions');
    actionsDiv.style.display = 'flex';
    
    // Restaurar ambos os botões
    const btnUpload = actionsDiv.querySelector('.btn-upload');
    const btnTakePhoto = actionsDiv.querySelector('.btn-take-photo');
    btnUpload.style.display = 'inline-block';
    btnTakePhoto.style.display = 'inline-block';
}

// Função para abrir a câmera
async function openCamera() {
    try {
        // Esconder outros elementos
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'none';
        
        // Esconder completamente as opções de upload durante a captura de foto
        document.querySelector('.photo-modal-actions').style.display = 'none';
        
        // Configurações diferentes para mobile e desktop
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: isMobile ? 'user' : 'user' // 'user' para câmera frontal, 'environment' para traseira
            }
        };
        
        // Solicitar acesso à câmera
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        const video = document.getElementById('cameraVideo');
        video.srcObject = cameraStream;
        
        // Aguardar o vídeo carregar para iniciar o monitoramento
        video.addEventListener('loadedmetadata', () => {
            startFacePositionMonitoring();
        });
        
        document.getElementById('cameraContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao acessar a câmera:', error);
        
        // Restaurar elementos em caso de erro - mas só se não houver preview
        if (document.getElementById('imagePreview').style.display === 'none') {
            document.getElementById('dropZone').style.display = 'block';
        }
        document.querySelector('.photo-modal-actions').style.display = 'flex';
        
        let errorMessage = 'Não foi possível acessar a câmera.';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = 'Acesso à câmera foi negado. Por favor, permita o acesso à câmera nas configurações do navegador.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'Nenhuma câmera foi encontrada no dispositivo.';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = 'Câmera não é suportada neste navegador.';
        }
        
        showError(errorMessage);
    }
}

// Função para monitorar posicionamento do rosto
function startFacePositionMonitoring() {
    const instructions = document.querySelector('.face-frame-instructions');
    const faceFrame = document.querySelector('.face-frame');
    const captureBtn = document.getElementById('captureBtn');
    
    // Simular detecção de posicionamento (em uma implementação real, usaria uma biblioteca de detecção facial)
    let positionCheckCount = 0;
    
    const positionCheckInterval = setInterval(() => {
        positionCheckCount++;
        
        // Simular análise de posicionamento baseada em tempo
        // Em uma implementação real, isso seria baseado na detecção de rosto
        if (positionCheckCount > 3 && positionCheckCount < 10) {
            // Rosto bem posicionado
            faceFrame.className = 'face-frame ready';
            instructions.textContent = '✅ Perfeito! Clique para capturar';
            instructions.style.background = 'rgba(40, 167, 69, 0.9)';
            captureBtn.style.background = '#28a745';
            captureBtn.disabled = false;
        } else if (positionCheckCount >= 10) {
            // Resetar para simular movimento
            positionCheckCount = 0;
            faceFrame.className = 'face-frame adjusting';
            instructions.textContent = '⚠️ Centralize melhor seu rosto';
            instructions.style.background = 'rgba(255, 193, 7, 0.9)';
            captureBtn.style.background = '#ffc107';
            captureBtn.disabled = false;
        } else {
            // Posicionamento inicial
            faceFrame.className = 'face-frame positioning';
            instructions.textContent = '👤 Posicione seu rosto dentro da moldura';
            instructions.style.background = 'rgba(255, 107, 107, 0.9)';
            captureBtn.style.background = '#dc3545';
            captureBtn.disabled = false; // Permitir captura mesmo sem posicionamento perfeito
        }
    }, 1000);
    
    // Limpar intervalo quando parar a câmera
    const originalStopCamera = stopCamera;
    stopCamera = function() {
        clearInterval(positionCheckInterval);
        stopCamera = originalStopCamera;
        originalStopCamera();
    };
}

// Função para capturar foto da webcam
function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');
    
    // Configurar dimensões do canvas para uma resolução adequada para reconhecimento facial
    const captureWidth = 400;
    const captureHeight = 400; // Quadrado para melhor processamento
    canvas.width = captureWidth;
    canvas.height = captureHeight;
    
    // Calcular área central baseada na moldura
    const frameWidth = 200;
    const frameHeight = 250;
    
    // Posição da moldura no vídeo (centralizada)
    const videoRect = video.getBoundingClientRect();
    const frameX = (video.videoWidth - frameWidth) / 2;
    const frameY = (video.videoHeight - frameHeight) / 2;
    
    // Capturar a região da moldura com uma margem adicional
    const margin = 50; // pixels de margem ao redor da moldura
    const cropX = Math.max(0, frameX - margin);
    const cropY = Math.max(0, frameY - margin);
    const cropWidth = Math.min(video.videoWidth - cropX, frameWidth + (margin * 2));
    const cropHeight = Math.min(video.videoHeight - cropY, frameHeight + (margin * 2));
    
    // Preencher o canvas com fundo branco (importante para reconhecimento facial)
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, captureWidth, captureHeight);
    
    // Desenhar a região capturada centralizada no canvas
    const destX = (captureWidth - cropWidth) / 2;
    const destY = (captureHeight - cropHeight) / 2;
    
    context.drawImage(
        video,
        cropX, cropY, cropWidth, cropHeight, // Região de origem (área da moldura)
        destX, destY, cropWidth, cropHeight  // Posição de destino (centralizada)
    );
    
    // Converter para blob com alta qualidade para reconhecimento facial
    canvas.toBlob(function(blob) {
        // Criar um arquivo a partir do blob
        currentPhotoFile = new File([blob], 'facial-recognition-photo.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
        });
        
        // Mostrar preview
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95); // Alta qualidade
        document.getElementById('previewImg').src = dataUrl;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('cameraContainer').style.display = 'none';
        document.getElementById('savePhotoBtn').disabled = false;
        
        // Manter a área de drag and drop oculta após capturar
        document.getElementById('dropZone').style.display = 'none';
        
        // Mostrar apenas o botão de tirar foto novamente (sem upload)
        const actionsDiv = document.querySelector('.photo-modal-actions');
        actionsDiv.style.display = 'flex';
        
        // Esconder o botão de upload e mostrar apenas o de tirar foto
        const btnUpload = actionsDiv.querySelector('.btn-upload');
        const btnTakePhoto = actionsDiv.querySelector('.btn-take-photo');
        btnUpload.style.display = 'none';
        btnTakePhoto.style.display = 'inline-block';
        
        // Parar a câmera
        stopCamera();
    }, 'image/jpeg', 0.95); // Alta qualidade para reconhecimento facial
}

// Função para parar a câmera
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    document.getElementById('cameraContainer').style.display = 'none';
    
    // Não restaurar automaticamente a dropZone aqui
    // Isso será feito apenas quando necessário (cancelar câmera ou remover imagem)
}

// Função específica para cancelar a câmera e voltar ao estado inicial
function cancelCamera() {
    stopCamera();
    
    // Restaurar área de drag and drop apenas se não houver preview
    if (document.getElementById('imagePreview').style.display === 'none') {
        document.getElementById('dropZone').style.display = 'block';
    }
    
    // Sempre restaurar as opções de upload quando cancelar a câmera
    const actionsDiv = document.querySelector('.photo-modal-actions');
    actionsDiv.style.display = 'flex';
    
    // Restaurar ambos os botões
    const btnUpload = actionsDiv.querySelector('.btn-upload');
    const btnTakePhoto = actionsDiv.querySelector('.btn-take-photo');
    btnUpload.style.display = 'inline-block';
    btnTakePhoto.style.display = 'inline-block';
}

// Função para salvar a foto
async function savePhoto() {
    if (!currentPhotoFile) {
        showError('Nenhuma foto foi selecionada.');
        return;
    }
    
    const saveBtn = document.getElementById('savePhotoBtn');
    const originalText = saveBtn.innerHTML;
    
    // Mostrar loading
    saveBtn.innerHTML = '<span class="loading"></span>Salvando...';
    saveBtn.disabled = true;
    
    try {
        // Criar FormData para envio - reutilizando a estrutura original
        const formData = new FormData();
        formData.append('foto_perfil_usuario', currentPhotoFile);
        formData.append('action', 'salvarFotoCandidato');
        
        // Fazer upload via AJAX usando jQuery para manter compatibilidade
        $.ajax({
            type: "POST",
            url: "../service/ajax_service.php",
            data: formData,    
            processData: false,
            contentType: false,
            enctype: 'multipart/form-data',
            mimeType: 'multipart/form-data',
            success: function (response) {
                try {
                    var result = $.parseJSON(response);
                    if (result.status == '1') {
                        // Fechar modal primeiro
                        closePhotoModal();
                        
                        // Mostrar mensagem de sucesso
                        showSuccessMessage('Foto atualizada com sucesso!');
                        
                        // Recarregar a foto do perfil
                        loadProfileFoto();

                        // Se existir o botão antigo, esconder ele
                        const oldSaveBtn = document.querySelector('.save-photo');
                        if (oldSaveBtn) {
                            $(oldSaveBtn).hide();
                            $(oldSaveBtn).html('<svg class="icon icon-checkmark"><use xlink:href="#icon-checkmark"></use></svg> Salvar foto');
                        }
                        
                    } else if (result.status == '0') {
                        showError(result.msg || 'Erro ao salvar a foto.');
                    }
                } catch (e) {
                    console.log('Erro ao processar resposta:', e);
                    showError('Não foi possível enviar a imagem. Tente novamente.');
                }
            },
            error: function(xhr, status, error) {
                console.error('Erro na requisição AJAX:', error);
                showError('Erro ao conectar com o servidor. Tente novamente.');
            },
            complete: function() {
                // Restaurar botão
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        });
        
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        showError('Erro ao conectar com o servidor. Tente novamente.');
        
        // Restaurar botão em caso de erro
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Função para mostrar erro
function showError(message) {
    // Remover mensagens de erro anteriores
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    // Criar nova mensagem de erro
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Adicionar ao modal
    const modalBody = document.querySelector('.photo-modal-body');
    modalBody.appendChild(errorDiv);
    
    // Remover após 5 segundos
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Função para mostrar mensagem de sucesso
function showSuccessMessage(message) {
    // Criar mensagem de sucesso
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    successDiv.textContent = message;
    
    document.body.appendChild(successDiv);
    
    // Remover após 3 segundos
    setTimeout(() => {
        successDiv.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => successDiv.remove(), 300);
    }, 3000);
}

// Event listeners para drag and drop
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    
    if (dropZone) {
        // Prevenir comportamentos padrão
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop zone quando item está sendo arrastado sobre ele
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        // Lidar com arquivos soltos
        dropZone.addEventListener('drop', handleDrop, false);
        
        // Click para abrir seletor de arquivo
        dropZone.addEventListener('click', function() {
            document.getElementById('fileInput').click();
        });
    }
    
    // Fechar modal ao clicar fora dele
    const modal = document.getElementById('photoModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closePhotoModal();
            }
        });
    }
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closePhotoModal();
        }
    });
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    document.getElementById('dropZone').classList.add('drag-over');
}

function unhighlight(e) {
    document.getElementById('dropZone').classList.remove('drag-over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
}

// Adicionar estilos de animação se não existirem
if (!document.querySelector('#photo-modal-animations')) {
    const style = document.createElement('style');
    style.id = 'photo-modal-animations';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Função de compatibilidade para o sistema antigo
function salvarFoto() {
    // Redirecionar para a nova função savePhoto se estiver no modal
    if (document.getElementById('photoModal') && document.getElementById('photoModal').style.display === 'block') {
        savePhoto();
        return;
    }
    
    // Manter funcionalidade original para o sistema antigo
    if ($('.upload-file')[0] && $('.upload-file')[0].files && $('.upload-file')[0].files[0]) {
        var data = new FormData();
        data.append('foto_perfil_usuario', $('.upload-file')[0].files[0]);
        data.append('action', 'salvarFotoCandidato');
        $.ajax({
            type: "POST",
            url: "../service/ajax_service.php",
            data: data,    
            processData: false,
            contentType: false,
            enctype: 'multipart/form-data',
            mimeType: 'multipart/form-data',
            success: function (response) {
                try {
                    var o = $.parseJSON(response);
                    if( o.status == '1') {
                        $('.save-photo').hide(200);
                        $('.save-photo').html('<svg class="icon icon-checkmark"><use xlink:href="#icon-checkmark"></use></svg> Salvar foto');
                        
                        // Recarregar a foto do perfil
                        loadProfileFoto();
                        
                        // Mostrar mensagem de sucesso
                        showSuccessMessage('Foto atualizada com sucesso!');
                    } else if ( o.status == '0') {
                        var conteudoModal = '<div class="modal__content__close">x</div>' +
                        '<div class="row justify-content-center">' +
                            '<div class="col-10">' +
                                '<span class="feedback-message">' +
                                    o.msg  +
                                '</span>' +
                            '</div>' +
                        '</div>';
                        openModal('small', conteudoModal);
                        $('.save-photo').hide(200);
                        $('.save-photo').html('<svg class="icon icon-checkmark"><use xlink:href="#icon-checkmark"></use></svg> Salvar foto');
                    }
                } catch( e ) {
                    console.log(e);
                    var conteudoModal = '<div class="modal__content__close">x</div>' +
                        '<div class="row justify-content-center">' +
                            '<div class="col-10">' +
                                '<span class="feedback-message">' +
                                    'Não foi possível enviar a imagem. Tente novamente.' +
                                '</span>' +
                            '</div>' +
                        '</div>';
                        openModal('small', conteudoModal);
                        $('.save-photo').hide(200);
                        $('.save-photo').html('<svg class="icon icon-checkmark"><use xlink:href="#icon-checkmark"></use></svg> Salvar foto');
                }
            }
        });
    }
}

// Função para recarregar a foto do perfil após atualização
function loadProfileFoto() {
    // Se configurado para reload completo da página
    if (PHOTO_UPDATE_CONFIG.usePageReload) {
        setTimeout(() => {
            location.reload();
        }, PHOTO_UPDATE_CONFIG.reloadDelay);
        return;
    }
    
    const profileImg = document.querySelector('.intro__photo');
    if (!profileImg) {
        // Se não houver imagem de perfil, recarregar a página como fallback
        setTimeout(() => {
            location.reload();
        }, 1500);
        return;
    }
    
    // Buscar a foto atualizada do servidor
    $.ajax({
        type: "GET",
        url: "../service/ajax_service.php",
        data: {
            action: "getFotoCandidato"
        },
        success: function (response) {
            try {
                const result = JSON.parse(response);
                if (result && result != '' && result != null) {
                    // URL da foto do servidor
                    const fotoUrl = window.location.origin + '/site/imagem_candidato/' + result;

                    // Criar uma nova imagem para verificar se carrega
                    const testImg = new Image();
                    testImg.onload = function() {
                        // Atualizar a foto com cache bust para garantir reload
                        profileImg.src = fotoUrl + '?t=' + Date.now();
                        console.log('Foto do perfil atualizada:', fotoUrl);
                    };
                    testImg.onerror = function() {
                        console.warn('Foto não encontrada, usando placeholder');
                        // Se a foto não carregar, usar placeholder
                        profileImg.src = '../assets/img/user-placeholder.png?t=' + Date.now();
                    };
                    testImg.src = fotoUrl;
                } else {
                    // Se não há foto, usar placeholder
                    profileImg.src = '../assets/img/user-placeholder.png?t=' + Date.now();
                }
            } catch (error) {
                console.error('Erro ao processar resposta da foto:', error);
                // Em caso de erro, recarregar a página como fallback
                setTimeout(() => {
                    location.reload();
                }, 1500);
            }
        },
        error: function(xhr, status, error) {
            console.error('Erro ao buscar foto atualizada:', error);
            // Em caso de erro na requisição, recarregar a página
            setTimeout(() => {
                location.reload();
            }, 1500);
        }
    });
}