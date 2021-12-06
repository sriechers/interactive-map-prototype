class PromptDialog {
  constructor(options){
    this.options = options || {};
    this.options.cancelText = options.hasOwnProperty('cancelText') ? options.cancelText : 'cancel';
    this.options.okText = options.hasOwnProperty('okText') ? options.okText : 'OK';
    this.options.headlineText = options.hasOwnProperty('headlineText') ? options.okText : 'Marker erstellen';
    this.options.create = options.hasOwnProperty('create') ? options.create : false;
    this.options.getUserInput = options.hasOwnProperty('getUserInput') ? options.getUserInput : null;
    this.options.onCancel = options.hasOwnProperty('onCancel') ? options.onCancel : null;
    this.uid = `popup_${new Date().getTime()}-${Math.floor(Math.random() * 1024)}`;
    this.content = {};
    this.template = `
      <div class="popup" id="${this.uid}">
        <div class="alerty-overlay active" tabindex="-1"></div>
        <div class="alerty alerty-show">
          <div class="alerty-content">
            <p class="alerty-message"></p>
            <div class="alerty-prompt">
              <h2>${this.options.headlineText}</h2>
              <hr>
              <div class="textinput">
                <label for="marker-title">
                  <h3 class="field-label-text">Titel</h3>
                  <input class="popup-input-field" id="marker-title" type="text" placeholder="Gib deinem Marker einen Titel" required="required" value="" autocomplete="off">
                  <div class="input-line"></div>
                </label>
              </div>
              <div class="textinput">
                <label for="marker-desc">
                  <h3 class="field-label-text">Beschreibung</h3>
                  <textarea class="popup-input-field" id="marker-desc" type="text" placeholder="Beschreibe deinen Eintrag" required="required" value="" autocomplete="off"></textarea>
                  <div class="input-line"></div>
                </label>
              </div>
              <div class="textinput">
                <label for="marker-tag">
                  <h3 class="field-label-text">Kategorie</h3>
                  <select id="marker-tag" name="marker-tag">
                  ${categories.map(function (category) {
                    return `
                    <option>${category}</option>
                    `
                  }).join('')}
                  </select>
                </label>
              </div>
            </div>
          </div>
          <div class="alerty-action">
            <a class="btn-ok button-round button">${this.options.okText}</a>
            <a class="btn-cancel">${this.options.cancelText}</a>
          </div>  
        </div>
      </div>
    `;
    if(this.options.create){
      this.create();
    }
  }
  create(){
    this.dialogBox = document.createElement('div');
    this.dialogBox.innerHTML = this.template;
    document.body.appendChild(this.dialogBox);

    this.ref = document.querySelector('#'+this.uid);
    this.btnOk = this.ref.querySelector('.btn-ok');
    this.btnCancel = this.ref.querySelector('.btn-cancel');
    this.btnOk.addEventListener('click', this.onAccepted.bind(this));
    this.btnCancel.addEventListener('click', this.onCanceled.bind(this));
    this.ref.querySelectorAll('.popup-input-field').forEach((field)=>{
      field.addEventListener('keyup', this.validateFields.bind(this));
    })
    
  }
  validateFields(){
    this.errorFields = new Set();
    this.ref.querySelectorAll('.popup-input-field').forEach((input)=>{
      // Check if Field is required
      if(input.getAttribute('required') === 'required' && input.value.length == 0){
        this.errorFields.add(input);
        input.closest('.textinput').querySelector('.field-label-text').classList.add('error');
      } else {
        input.closest('.textinput').querySelector('.field-label-text').classList.remove('error');
        this.errorFields.delete(input);
      }
    });

  }
  onAccepted(e){
    this.validateFields();
    if(this.errorFields.size > 0){
      Toastify({
        text: 'Bitte fülle alle Felder aus',
        duration: 3000,
        newWindow: true,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "left", // `left`, `center` or `right`
        backgroundColor: "#e03a7a",
        stopOnFocus: true, // Prevents dismissing of toast on hover
      }).showToast();
      return;
    }
    this.options.getUserInput(this.getValues());
    this.destroy();
  }
  onCanceled(e){
    this.options.onCancel();
    this.destroy();
  }
  getValues(){
    return {
      markerId: this.uid,
      title: this.ref.querySelector('#marker-title').value,
      desc: this.ref.querySelector('#marker-desc').value,
      tag: this.ref.querySelector('#marker-tag').value
    }
  }
  destroy(){
    this.ref.querySelector('.alerty-overlay').classList.remove('active');
    this.ref.querySelector('.alerty').classList.remove('alerty-show');
    this.btnOk.removeEventListener('click',this.onAccepted);
    this.btnCancel.removeEventListener('click',this.onCanceled);
    this.ref.remove();
  }
  
}