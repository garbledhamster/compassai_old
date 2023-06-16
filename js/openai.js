import {OPEN_AI_API} from '@/config'

let prevAbortController = null

export async function askOpenAI({authKey, model, prompt}) {
  model.messages = [{role: 'user', content: prompt}]
  model.stream = true

  const abortController = new AbortController()

  if (prevAbortController) {
    prevAbortController.abort()
  }

  prevAbortController = abortController

  return fetch(OPEN_AI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authKey}`,
    },
    body: JSON.stringify(model),
    signal: abortController.signal,
  }).then(async response => {
    const streamReader = response.body.getReader()

    if (!response.ok) {
      const decoder = new TextDecoder()
      const {value} = await streamReader.read()
      const text = decoder.decode(value, {stream: true})

      try {
        response.data = JSON.parse(text)
      } catch (e) {}

      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({response})
    }

    return streamReader
  })
}

export async function parseStream(streamReader, onUpdate = () => null) {
  const decoder = new TextDecoder()
  let text = ''

  while (true) {
    const {done, value} = await streamReader.read()

    if (done) return text

    const chunk = decoder.decode(value, {stream: true})
    const dataStrList = chunk.split('\n\n')

    dataStrList.forEach(dataStr => {
      const dataJson = dataStr.replace(/^data:/, '').trim()
      try {
        const data = JSON.parse(dataJson)
        const content = data?.choices[0]?.delta?.content
        if (!content) return

        text += content

        onUpdate(text)
      } catch (e) {}
    })
  }
}

import {gettext} from './utils'

export const OPEN_AI_API = 'https://api.openai.com/v1/chat/completions'

export const FLUENTIFY_CONFIG_STORAGE_KEY = 'FLUENTIFY_CONFIG'

export const ROUTE = {
  PROMPT_BOARD_ENTRY_PANEL: '/',
  PROMPT_ASK_PAGE_PANEL: '/ask-page',
  PROMPT_BOARD_PRESET_PANEL: '/preset-panel',
  PROMPT_BOARD_CUSTOM_PANEL: '/custom-panel',
}

export interface Prompt {
  title: string
  command: string
}

export const defaultConfig = {
  authKey: '',
  isAuth: false,

  autoPopup: false,
  turboMode: false,
  customCommand: '',
  latestRoute: ROUTE.PROMPT_BOARD_ENTRY_PANEL,
  latestPresetPromptIndex: 0,

  prompts: [
    {
      title: gettext('Summarize'),
      command: gettext('Summarize and express these words concisely'),
    },
    {
      title: gettext('Refine'),
      command: gettext(
        'Refine text, review and revise problems in spelling, grammar, punctuation, word usage, and sentence structure'
      ),
    },
    {
      title: gettext('Disagree'),
      command: gettext(
        'Identify any logical or factual errors in these texts and provide a rebuttal. At the same time, present the opposite viewpoint with supporting evidence'
      ),
    },
  ] as Prompt[],

  model: {
    model: 'gpt-3.5-turbo',
    temperature: 1,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop: '<|endoftext|>',
  },
}

export const MESSAGING_EVENT = {
  GET_SELECTED_TEXT: 'GET_SELECTED_TEXT',
  EXTNEION_ICON_CLICK: 'EXTNEION_ICON_CLICK',
  SET_AUTO_POPUP: 'SET_AUTO_POPUP',
  INVOKE_ASK_AI: 'INVOKE_ASK_AI',
  SYNC_FRAME_SIZE: 'SYNC_FRAME_SIZE',
  SYNC_SELECTED_TEXT: 'SYNC_SELECTED_TEXT',
  CLICK_CLOSE: 'CLICK_CLOSE',
  CLEAN_DATA: 'CLEAN_DATA',
  GET_DOCUMENT: 'GET_DOCUMENT',
  INPUT_FOCUS: 'INPUT_FOCUS',
}
import {toast as rowToast} from 'react-toastify'

export function getSelectedText() {
  let selected = ''

  if (window.getSelection) {
    selected = window.getSelection().toString()
  } else if (document.selection) {
    selected = document.selection?.createRange().text
  }

  if (selected === '') {
    const activeElement = document.activeElement
    if (!activeElement) return selected

    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      const el = activeElement
      selected = el.value.slice(el.selectionStart || 0, el.selectionEnd || 0)
    } else if (activeElement.tagName === 'IFRAME') {
      const contentWindow = activeElement.contentWindow

      if (contentWindow.getSelection) {
        selected = contentWindow.getSelection().toString() || ''
      }
    }
  }

  return selected.toString().trim() || ''
}

export function getSelectedTextPosition() {
  if (!window.getSelection) return undefined
  const range = window.getSelection().getRangeAt(0)
  const rangeRect = range.getBoundingClientRect()
  const rects = range.getClientRects()

  if (rects.length === 0) {
    const input = range.commonAncestorContainer
    if (input.nodeName === 'INPUT' || input.nodeName === 'TEXTAREA') {
      const inputRect = input.getBoundingClientRect()
      const x = inputRect.left + rangeRect.left + inputRect.width / 2
      const y = inputRect.top + inputRect.height
      return {x, y}
    } else {
      for (const node of input.childNodes) {
        if (node.nodeName === 'TEXTAREA' || node.nodeName === 'INPUT') {
          const inputRect = node.getBoundingClientRect()
          const x = inputRect.left + inputRect.width / 2
          const y = inputRect.top + inputRect.height
          return {x, y}
        }
      }
    }
    return null
  }

  const lastRect = rects[rects.length - 1]
  const x = lastRect.left
  const y = lastRect.top + lastRect.height
  return {x, y}
}

export function navToOptions() {
  const {openOptionsPage, getURL} = chrome?.runtime

  if (openOptionsPage) {
    openOptionsPage()
  } else {
    window.open(getURL('options.html'))
  }
}

export function gettext(text) {
  let res = ''
  try {
    const key = text.replace(/[^A-Za-z0-9_]/g, '_')
    res = chrome.i18n.getMessage(key) || text
  } catch (e) {
    res = text
  }

  return res
}

export function noop() {
  return null
}

const toastConfig = {
  position: 'top-center',
  style: {width: '80%', margin: '60px auto'},
  autoClose: 1000, // ms
  limit: 1,
  hideProgressBar: true,
  closeOnClick: false,
  pauseOnHover: false,
  draggable: false,
  progress: undefined,
  theme: 'light',
}

export function toast(text, config = {}) {
  rowToast(text, {
    ...toastConfig,
    ...config,
  })
}

toast.info = (text, config = {}) => {
  rowToast.info(text, {...toastConfig, ...config})
}

toast.warn = (text, config = {}) => {
  rowToast.warn(text, {...toastConfig, ...config})
}

toast.success = (text, config = {}) => {
  rowToast.success(text, {...toastConfig, autoClose: 4000, ...config})
}

toast.error = (text, config = {}) => {
  rowToast.error(text, {...toastConfig, autoClose: 4000, ...config})
}
import {createContext, useReducer} from 'react'
import {sendToContentScript} from '@plasmohq/messaging'
import {encode, decode} from 'gpt-3-encoder'

import {askOpenAI, parseStream} from '@/io'
import {gettext, toast} from '@/utils'
import {MESSAGING_EVENT, ROUTE} from '@/config'

import useConfig from '@/hooks/use-config'

export const AIContext = createContext({ai: null, aiDispatch: null})

export const AI_REDUCER_ACTION_TYPE = {
  REQUEST: 'REQUEST',
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  SET_RESULT: 'SET_RESULT',
}

const initialState = {
  loading: false,
  error: null,
  result: null,
}

export function withAIContext(Component) {
  return function WithAIContext(props) {
    const [ai, aiDispatch] = useReducer(reducer, initialState)
    const {config, setConfig} = useConfig()

    const askAI = async ({authKey, command, text = '', onlyCommand = false}) => {
      let selectedText = text.trim()

      if (!onlyCommand && (!text || text === '')) {
        try {
          selectedText = await sendToContentScript({
            name: MESSAGING_EVENT.GET_SELECTED_TEXT,
          })
        } catch (e) {}

        if (!selectedText.trim()) {
          return toast.error(
            gettext('Remember to select text. If using for the first time, refresh the page')
          )
        }
      }

      aiDispatch({type: AI_REDUCER_ACTION_TYPE.REQUEST})

      // due to ChatGPT3.5 max token limit, srhink all content to 3600 token.
      let prompt = onlyCommand ? command : `${command}:\n\n${selectedText}\n\n`

      const encoded = encode(prompt)
      if (encoded.length > 3600) prompt = decode(encoded.slice(0, 3600))

      return askOpenAI({
        authKey: authKey || config.authKey,
        model: config.model,
        prompt,
      })
        .then(streamReader => {
          return parseStream(streamReader, result => {
            aiDispatch({type: AI_REDUCER_ACTION_TYPE.SUCCESS, payload: {result}})
          })
        })
        .catch(err => {
          if (err instanceof DOMException && /aborted/.test(err.message)) {
            return
          }

          aiDispatch({type: AI_REDUCER_ACTION_TYPE.FAILURE, payload: err})

          if (err.response && err.response.status === 401) {
            setConfig({
              ...config,
              authKey: '',
              latestRoute: ROUTE.PROMPT_BOARD_ENTRY_PANEL,
              isAuth: false,
            })
            toast.error(gettext('Auth key not available, please reset'))
          } else {
            let errorMsg = err.message || ''

            if (err?.response?.data?.error?.message) {
              errorMsg = `OpenAI: ${err.response.data.error.message}`
            }

            toast.error(errorMsg)
          }

          throw err
        })
    }

    const context = {ai, askAI, aiDispatch}

    return (
      <AIContext.Provider value={context}>
        <Component {...props} />
      </AIContext.Provider>
    )
  }
}

function reducer(state, action) {
  switch (action.type) {
    case AI_REDUCER_ACTION_TYPE.REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
        result: null,
      }

    case AI_REDUCER_ACTION_TYPE.SUCCESS:
      return {
        ...state,
        error: null,
        loading: false,
        result: action.payload.result,
      }

    case AI_REDUCER_ACTION_TYPE.FAILURE:
      return {
        ...state,
        loading: false,
        error: {
          ...action.payload,
        },
        result: null,
      }

    case AI_REDUCER_ACTION_TYPE.SET_RESULT:
      return {
        ...state,
        result: action.payload.result,
      }
  }
}

// build a function to pull youtube transcripts with just the youtube link

// write a function to accept a youtube link and return the transcript
function getTranscript(youtubeLink) {
  // use youtube-dl to get the transcript
  // return the transcript
} 