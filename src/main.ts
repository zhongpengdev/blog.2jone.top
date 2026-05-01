import { createApp, defineCustomElement } from 'vue'
import './style.css'
import router from './router'
import App from './App.vue'
import SmartImageCE from './components/SmartImage.ce.vue'

// 注册自定义元素，以便在 innerHTML 中使用
const SmartImage = defineCustomElement(SmartImageCE)
customElements.define('smart-image', SmartImage)

createApp(App).use(router).mount('#app')
