<template>
  <div class="tinyflow-editor-container">
    <!-- 工具栏 -->
    <div class="tinyflow-toolbar">
      <el-button @click="saveWorkflow" type="primary" :loading="saving">
        <el-icon><Document /></el-icon>
        保存工作流
      </el-button>
      <el-button @click="debugWorkflow">
        <el-icon><VideoPlay /></el-icon>
        调试
      </el-button>
      <el-button @click="exportWorkflow">
        <el-icon><Download /></el-icon>
        导出 JSON
      </el-button>
      <el-button @click="importWorkflow">
        <el-icon><Upload /></el-icon>
        导入 JSON
      </el-button>
    </div>

    <!-- TinyFlow 编辑器 -->
    <Tinyflow
      ref="tinyflowRef"
      class="tinyflow-canvas"
      :style="{ width: '100%', height: 'calc(100vh - 120px)' }"
      :data="workflowData"
    />

    <!-- 调试对话框 -->
    <el-dialog
      v-model="debugVisible"
      title="工作流调试"
      width="800px"
      :close-on-click-modal="false"
    >
      <div class="debug-panel">
        <el-form label-width="80px">
          <el-form-item label="测试输入">
            <el-input
              v-model="debugInput"
              type="textarea"
              :rows="4"
              placeholder="输入测试问题或数据..."
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              @click="runDebug"
              :loading="debugging"
            >
              执行测试
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="debugResult" class="debug-result">
          <h4>执行结果:</h4>
          <el-scrollbar height="300px">
            <pre>{{ JSON.stringify(debugResult, null, 2) }}</pre>
          </el-scrollbar>
        </div>
      </div>
    </el-dialog>

    <!-- 导入对话框 -->
    <el-dialog
      v-model="importVisible"
      title="导入工作流"
      width="600px"
    >
      <el-input
        v-model="importJson"
        type="textarea"
        :rows="10"
        placeholder="粘贴工作流 JSON 数据..."
      />
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确定导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Tinyflow } from '@tinyflow-ai/vue'
import '@tinyflow-ai/vue/dist/index.css'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, VideoPlay, Download, Upload } from '@element-plus/icons-vue'

interface Props {
  appId: string
  initialData?: any
}

const props = defineProps<Props>()
const emit = defineEmits(['save', 'debug'])

// Refs
const tinyflowRef = ref<InstanceType<typeof Tinyflow> | null>(null)
const workflowData = ref<any>({
  nodes: [],
  edges: []
})

// State
const saving = ref(false)
const debugging = ref(false)
const debugVisible = ref(false)
const debugInput = ref('')
const debugResult = ref<any>(null)
const importVisible = ref(false)
const importJson = ref('')

// 初始化
onMounted(() => {
  if (props.initialData) {
    workflowData.value = props.initialData
  }
})

// 保存工作流
async function saveWorkflow() {
  if (!tinyflowRef.value) {
    ElMessage.error('编辑器未初始化')
    return
  }

  try {
    saving.value = true
    const data = tinyflowRef.value.getData()
    
    const response = await fetch('/api/workflow/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appId: props.appId,
        flowData: JSON.stringify(data)
      })
    })

    const result = await response.json()
    
    if (result.code === 0) {
      ElMessage.success('保存成功')
      emit('save', data)
    } else {
      ElMessage.error(result.msg || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败,请重试')
  } finally {
    saving.value = false
  }
}

// 调试工作流
function debugWorkflow() {
  if (!tinyflowRef.value) {
    ElMessage.error('编辑器未初始化')
    return
  }

  const data = tinyflowRef.value.getData()
  
  // 检查是否有节点
  if (!data.nodes || data.nodes.length === 0) {
    ElMessage.warning('请先添加节点')
    return
  }

  debugVisible.value = true
  debugResult.value = null
}

// 执行调试
async function runDebug() {
  if (!debugInput.value.trim()) {
    ElMessage.warning('请输入测试数据')
    return
  }

  if (!tinyflowRef.value) return

  try {
    debugging.value = true
    const data = tinyflowRef.value.getData()

    const response = await fetch('/api/workflow/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appId: props.appId,
        flowData: JSON.stringify(data),
        input: {
          question: debugInput.value
        }
      })
    })

    debugResult.value = await response.json()
    emit('debug', debugResult.value)
  } catch (error) {
    console.error('执行失败:', error)
    ElMessage.error('执行失败,请重试')
  } finally {
    debugging.value = false
  }
}

// 导出工作流
function exportWorkflow() {
  if (!tinyflowRef.value) {
    ElMessage.error('编辑器未初始化')
    return
  }

  const data = tinyflowRef.value.getData()
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workflow-${props.appId}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('导出成功')
}

// 导入工作流
function importWorkflow() {
  importVisible.value = true
  importJson.value = ''
}

// 确认导入
function confirmImport() {
  try {
    const data = JSON.parse(importJson.value)
    workflowData.value = data
    importVisible.value = false
    ElMessage.success('导入成功')
  } catch (error) {
    ElMessage.error('JSON 格式错误,请检查')
  }
}

// 暴露方法给父组件
defineExpose({
  getData: () => tinyflowRef.value?.getData(),
  saveWorkflow
})
</script>

<style scoped lang="scss">
.tinyflow-editor-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.tinyflow-toolbar {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tinyflow-canvas {
  flex: 1;
  overflow: hidden;
}

.debug-panel {
  .debug-result {
    margin-top: 20px;
    
    h4 {
      margin-bottom: 10px;
      color: #303133;
    }
    
    pre {
      background: #f5f7fa;
      padding: 12px;
      border-radius: 4px;
      font-size: 13px;
      line-height: 1.6;
      color: #606266;
    }
  }
}

// 修复 Element Plus 样式冲突
:deep(.tinyflow-canvas) {
  select {
    appearance: auto !important;
    -webkit-appearance: menulist !important;
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    border: 2px solid #d9d9d9;
    border-radius: 4px;
    transition: all 0.3s;
    position: relative;
    cursor: pointer;
    margin: 0 8px 0 0;

    &:checked {
      background-color: var(--el-color-primary);
      border-color: var(--el-color-primary);

      &::after {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: 8px;
        height: 12px;
        border: 2px solid #fff;
        border-top: 0;
        border-left: 0;
        transform: translate(-50%, -60%) rotate(45deg);
      }
    }

    &:hover {
      border-color: var(--el-color-primary-light-3);
    }
  }
}
</style>
