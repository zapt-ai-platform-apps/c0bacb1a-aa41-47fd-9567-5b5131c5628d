import { createSignal, Show } from 'solid-js'
import { createEvent } from './supabaseClient'
import { SolidMarkdown } from "solid-markdown"
import { saveAs } from 'file-saver'
import { marked } from 'marked'
import htmlToDocx from 'html-to-docx'

function App() {
  const [queryText, setQueryText] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [report, setReport] = createSignal('')

  const handleGetAdvice = async () => {
    if (!queryText()) return
    setLoading(true)
    try {
      const prompt = `Provide UK employment law advice to help resolve the following query by referring to applicable legislation and best practices:\n\n"${queryText()}"`
      const result = await createEvent('chatgpt_request', {
        prompt: prompt,
        response_type: 'text'
      })
      setReport(result)
    } catch (error) {
      console.error('Error creating event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShareReport = async () => {
    if (navigator.share && report()) {
      try {
        await navigator.share({
          title: 'Employment Law Advice Report',
          text: report()
        })
      } catch (error) {
        console.error('Error sharing report:', error)
      }
    } else {
      alert('Sharing not supported on this device.')
    }
  }

  const handleExportWord = async () => {
    if (!report()) return

    try {
      const mdHtml = marked(report())
      const docxBlob = await htmlToDocx(mdHtml, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
      })
      saveAs(docxBlob, 'Employment_Law_Advice_Report.docx')
    } catch (error) {
      console.error('Error exporting Word document:', error)
    }
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <div class="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md h-full">
        <h1 class="text-3xl font-bold mb-6 text-center">UK Employment Law Advice</h1>
        <div class="mb-6">
          <label for="query" class="block text-lg font-medium mb-2">Describe your employment issue or question:</label>
          <textarea
            id="query"
            class="w-full h-32 px-3 py-2 border rounded box-border focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your query here..."
            value={queryText()}
            onInput={(e) => setQueryText(e.target.value)}
          ></textarea>
        </div>
        <div class="flex justify-center mb-6">
          <button
            class="px-6 py-3 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
            onClick={handleGetAdvice}
            disabled={loading()}
          >
            <Show when={!loading()} fallback={<span>Generating Advice...</span>}>
              Get Advice
            </Show>
          </button>
        </div>
        <Show when={report()}>
          <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="text-xl font-semibold mb-2">Your Employment Law Advice:</h3>
            <div class="text-gray-700 prose">
              <SolidMarkdown children={report()} />
            </div>
          </div>
          <div class="flex justify-center space-x-4 mt-6">
            <button
              class="px-6 py-3 bg-green-500 text-white rounded cursor-pointer hover:bg-green-600"
              onClick={handleShareReport}
            >
              Share Report
            </button>
            <button
              class="px-6 py-3 bg-purple-500 text-white rounded cursor-pointer hover:bg-purple-600"
              onClick={handleExportWord}
            >
              Export as Word Document
            </button>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default App