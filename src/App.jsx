import { createSignal, Show, onMount } from 'solid-js'
import { createEvent, supabase } from './supabaseClient'
import { SolidMarkdown } from "solid-markdown"
import { saveAs } from 'file-saver'
import { marked } from 'marked'
import { Document, Paragraph, Packer } from 'docx'
import { Auth } from '@supabase/auth-ui-solid'
import { ThemeSupa } from '@supabase/auth-ui-shared'

function App() {
  const [queryText, setQueryText] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [report, setReport] = createSignal('')
  const [user, setUser] = createSignal(null)
  const [currentPage, setCurrentPage] = createSignal('login')

  const checkUserSignedIn = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      setCurrentPage('homePage')
    }
  }

  onMount(checkUserSignedIn)

  const handleGetAdvice = async () => {
    if (!queryText()) return
    setLoading(true)
    try {
      const prompt = `Provide UK employment law advice to help resolve the following query by referring to applicable legislation and best practices:\n\n"${queryText()}"`
      const result = await createEvent('chatgpt_request', {
        prompt: prompt,
        response_type: 'text',
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
          text: report(),
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
      const mdContent = report()
      const lines = mdContent.split('\n')
      const doc = new Document()

      const paragraphs = lines.map((line) => new Paragraph(line))
      doc.addSection({
        properties: {},
        children: paragraphs,
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, 'Employment_Law_Advice_Report.docx')
    } catch (error) {
      console.error('Error exporting Word document:', error)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCurrentPage('login')
  }

  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <Show
        when={currentPage() === 'homePage'}
        fallback={
          <div class="w-full max-w-md p-6 bg-white rounded-lg shadow-md h-full">
            <h2 class="text-2xl font-bold mb-4 text-center">Sign in with ZAPT</h2>
            <a
              href="https://www.zapt.ai"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-500 hover:underline mb-4 block text-center"
            >
              Learn more about ZAPT
            </a>
            <Auth
              supabaseClient={supabase}
              appearance={{ theme: ThemeSupa }}
              providers={['google', 'facebook', 'apple']}
            />
          </div>
        }
      >
        <div class="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md h-full">
          <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold">UK Employment Law Advice</h1>
            <button
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
          <div class="mb-6">
            <label for="query" class="block text-lg font-medium mb-2">
              Describe your employment issue or question:
            </label>
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
      </Show>
    </div>
  )
}

export default App