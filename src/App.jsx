import { createSignal, Show, onMount, createEffect } from 'solid-js'
import { createEvent, supabase } from './supabaseClient'
import { SolidMarkdown } from "solid-markdown"
import { saveAs } from 'file-saver'
import { marked } from 'marked'
import { Document, Packer, Paragraph, HeadingLevel } from 'docx'
import { Auth } from '@supabase/auth-ui-solid'
import { ThemeSupa } from '@supabase/auth-ui-shared'

function App() {
  const [queryText, setQueryText] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [report, setReport] = createSignal('')
  const [user, setUser] = createSignal(null)
  const [currentPage, setCurrentPage] = createSignal('login')
  const [userType, setUserType] = createSignal('')

  const checkUserSignedIn = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      setCurrentPage('homePage')
    }
  }

  onMount(checkUserSignedIn)

  createEffect(() => {
    const authListener = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user)
        setCurrentPage('homePage')
      } else {
        setUser(null)
        setCurrentPage('login')
      }
    })

    return () => {
      authListener.data.unsubscribe()
    }
  })

  const handleGetAdvice = async () => {
    if (!queryText()) return
    setLoading(true)
    try {
      const prompt = `As an ${userType()}, provide UK employment law advice to help resolve the following query by referring to applicable legislation and best practices:\n\n"${queryText()}"`
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

  const handleShareWhatsApp = () => {
    if (!report()) return
    const text = encodeURIComponent(report())
    const url = `https://api.whatsapp.com/send?text=${text}`
    window.open(url, '_blank')
  }

  const handleCopyReport = async () => {
    if (!report()) return
    try {
      await navigator.clipboard.writeText(report())
      alert('Report copied to clipboard.')
    } catch (error) {
      console.error('Failed to copy: ', error)
    }
  }

  const handleExportWord = async () => {
    if (!report()) return

    try {
      const mdContent = report()
      const tokens = marked.lexer(mdContent)
      const doc = new Document()

      const children = []

      tokens.forEach((token) => {
        if (token.type === 'heading') {
          children.push(
            new Paragraph({
              text: token.text,
              heading: HeadingLevel[`HEADING_${token.depth}`],
            })
          )
        } else if (token.type === 'paragraph') {
          children.push(new Paragraph(token.text))
        } else if (token.type === 'list') {
          token.items.forEach((item) => {
            children.push(
              new Paragraph({
                text: item.text,
                bullet: {
                  level: 0,
                },
              })
            )
          })
        } else if (token.type === 'text') {
          children.push(new Paragraph(token.text))
        }
      })

      doc.addSection({
        properties: {},
        children: children,
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

  const handleNewQuery = () => {
    setUserType('')
    setQueryText('')
    setReport('')
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
              magicLink={true}
              showLinks={false}
              view="magic_link"
            />
          </div>
        }
      >
        <div class="min-h-screen w-full flex flex-col items-center bg-gray-100">
          <div class="w-full max-w-2xl p-6 bg-white rounded-lg shadow-md h-full mt-4">
            <div class="flex justify-between items-center mb-6">
              <h1 class="text-3xl font-bold text-purple-600">Employment Advisor</h1>
              <button
                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
                onClick={handleSignOut}
              >
                Sign Out
              </button>
            </div>
            <Show when={!userType()}>
              <div class="text-center">
                <h2 class="text-2xl font-semibold mb-4">Are you an employer or an employee?</h2>
                <div class="flex justify-center space-x-4">
                  <button
                    class="px-6 py-3 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
                    onClick={() => setUserType('employer')}
                  >
                    Employer
                  </button>
                  <button
                    class="px-6 py-3 bg-green-500 text-white rounded cursor-pointer hover:bg-green-600"
                    onClick={() => setUserType('employee')}
                  >
                    Employee
                  </button>
                </div>
              </div>
            </Show>
            <Show when={userType() && !report()}>
              <div class="mt-6">
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
                <div class="flex justify-center mt-6">
                  <button
                    class={`px-6 py-3 bg-purple-500 text-white rounded cursor-pointer hover:bg-purple-600 ${loading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleGetAdvice}
                    disabled={loading()}
                  >
                    <Show when={!loading()} fallback={<span>Generating Advice...</span>}>
                      Get Advice
                    </Show>
                  </button>
                </div>
              </div>
            </Show>
            <Show when={report()}>
              <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 class="text-xl font-semibold mb-2 text-purple-600">Your Employment Law Advice:</h3>
                <div class="text-gray-700 prose">
                  <SolidMarkdown children={report()} />
                </div>
              </div>
              <div class="mt-4 text-sm text-red-600 text-center">
                Please note that this output is not legal advice and that you should seek proper legal advice if required.
              </div>
              <div class="flex flex-wrap justify-center space-x-4 mt-6">
                <button
                  class="px-6 py-3 bg-green-500 text-white rounded cursor-pointer hover:bg-green-600 mt-2"
                  onClick={handleShareWhatsApp}
                >
                  Share via WhatsApp
                </button>
                <button
                  class="px-6 py-3 bg-yellow-500 text-white rounded cursor-pointer hover:bg-yellow-600 mt-2"
                  onClick={handleCopyReport}
                >
                  Copy Report
                </button>
                <button
                  class="px-6 py-3 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 mt-2"
                  onClick={handleExportWord}
                >
                  Export as Word Document
                </button>
              </div>
              <div class="mt-6">
                <h3 class="text-lg font-medium mb-4 text-center">
                  Would you like to ask another query or exit the app?
                </h3>
                <div class="flex flex-wrap justify-center space-x-4">
                  <button
                    class="px-6 py-3 bg-purple-500 text-white rounded cursor-pointer hover:bg-purple-600 mt-2"
                    onClick={handleNewQuery}
                  >
                    Ask Another Query
                  </button>
                  <button
                    class="px-6 py-3 bg-red-500 text-white rounded cursor-pointer hover:bg-red-600 mt-2"
                    onClick={handleSignOut}
                  >
                    Exit the App
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default App