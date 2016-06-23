// Remove any crufty elements we might have
try {
    document.body.removeChild(document.getElementById('injected-sidebar'))
} catch(err) {}
try {
    document.body.removeChild(document.getElementById('injected-style'))
} catch(err) {}

// Create a new sidebar
const sidebar = document.createElement('div')
sidebar.id = 'injected-sidebar'
sidebar.style.width = '315px'
sidebar.style.height = 'calc(100% - 62px)'
sidebar.style.top = '62px'
sidebar.style.right = '0'
sidebar.style.position = 'fixed'
sidebar.style.background = 'white'
sidebar.style.overflowY = 'scroll'
sidebar.style.borderLeft = '2px solid rgba(0,0,0,.35)'
sidebar.style.padding = '10px'
document.body.appendChild(sidebar)

function waitUntilReady(callback, pollInterval) {
    if(pollInterval === undefined) { pollInterval = 200 }

    if(!document.querySelector('ts-message') ||
        document.querySelector('.unprocessed')) {
        setTimeout(() => waitUntilReady(callback), pollInterval)
        return
    }

    callback()
}

function initSidebar() {
    const msgsContainer = document.getElementById('msgs_div')
    sidebar.innerHTML = ''

    const pendingChanges = []
    let latestMessageId = 0

    function renderSidebar(messageElement) {
        const senderElement = messageElement.querySelector('.message_sender > a')
        const bodyElement = messageElement.querySelector('.message_body')
        const date = new Date(messageElement.dataset.ts * 1000)

        const post = document.createElement('div')
        const dateElement = document.createElement('span')
        const sender = document.createElement('div')
        const body = document.createElement('div')
        post.appendChild(sender)
        post.appendChild(dateElement)
        post.appendChild(body)
        sender.innerText = senderElement.innerText
        body.innerHTML = bodyElement.innerHTML
        dateElement.innerText = date.toLocaleString(undefined,
                                                    { hour: 'numeric',
                                                      minute: 'numeric' })
        dateElement.title = date.toLocaleString()

        sidebar.insertBefore(post, sidebar.firstChild)

        // Ensure that the sidebar hasn't grown too large
        for(let i = 100; i < sidebar.childNodes.length; i += 1) {
            sidebar.removeChild(sidebar.childNodes[i])
        }
    }

    function render() {
        console.log(`Rendering ${pendingChanges.length} elements`)
        for(let messageElement of pendingChanges) {
            // Ensure that this element still exists
            if(messageElement.parentNode === null) {
                continue
            }

            // Ensure that this is a new message
            const messageId = parseInt(messageElement.id.match(/_([0-9]+)$/)[1])
            if(messageId <= latestMessageId) {
                continue
            }

            if(messageElement.classList.contains('bot_message')) {
                renderSidebar(messageElement)
                continue
            }
        }
    }

    function onMessageChange(args, pollInterval) {
        // Wait a tick to collect our messages; otherwise we check for initial
        // state before Slack has populated it.
        pendingChanges.push.apply(pendingChanges, args)

        // If this is our first pending change, schedule a render cycle
        if(pendingChanges.length === args.length) {
            waitUntilReady(function() {
                try {
                    render()
                } catch(err) {
                    console.error(err)
                } finally {
                    pendingChanges.length = 0
                }
            }, pollInterval)
        }
    }

    const rootObserver = new MutationObserver((records) => {
        const flattened = []
        for(let record of records) {
            for(let element of record.addedNodes) {
                if(element.tagName === 'TS-MESSAGE') {
                    flattened.push(element)
                }
            }
        }
        if(flattened.length) {
            onMessageChange(flattened)
        }
    })

    waitUntilReady(() => {
        onMessageChange(msgsContainer.querySelectorAll('ts-message'), 1)

        // Begin observing after the initial onMessageChange call so we
        // can coalesce any of its results into the same render() call
        rootObserver.observe(msgsContainer, { childList: true, subtree: true })
    })
}

function main() {
    // Style tweaks
    const style = document.createElement('style')
    style.id = 'injected-style'
    style.innerHTML = 'ts-message .message_body { margin-left: 7em; display: block; }\n' +
                      'ts-message .message_sender { width: 7em; float: left; text-align: right; ' +
                      '                             overflow: hidden; height: 20px; ' +
                      '                             text-overflow: ellipsis; white-space: nowrap; }\n' +
                      '.message_content { margin-left: 1em !important; }\n' +
                      '.message_gutter { opacity: 0; float: left; background: white; }\n' +
                      '.message_gutter:hover { opacity: 1; }\n' +
                      '.bot_message { display: none; }\n' +
                      '#footer { width: calc(100% - 315px - 220px); }\n' +
                      '#injected-sidebar > div { margin: 0 0 30px 0; }\n' +
                      '#injected-sidebar > div * { font-size: 13px !important; }\n' +
                      '#injected-sidebar > div > div:first-child { display: inline-block; font-weight: bold; }\n' +
                      '#injected-sidebar > div > span { float: right }\n' +
                      '#messages_container { width: calc(100% - 315px - 220px); }\n' +
                      '#col_flex { z-index: 1; }'

    document.body.appendChild(style)
    const channelObserver = new MutationObserver(initSidebar)
    channelObserver.observe(document.getElementById('client_header'), { subtree: true, childList: true })
    initSidebar()
}

try {
    main()
} catch(err) {
    console.error(err)
}
