// Application.js - meeting point of games, user interactive, engine, and everything
//
// The one and only instance of Application is created here
// About terminology: *game* means static information & implementation, similar to program file on disk
// *session* means a running game instance state + backend engine state, similar to process in memory
// To keep implementation (of application) minimal, it only support one session
// The session could be paused explicitly by user or implicitly by some events (e.g. window size change)
// If user switch to another game in the menu, the session will be reset, previous game state will be lost
//
// todo: for app and engine
// move paused state to engine side
// rename stat to system in context
// find a proper way to merge runtime-provided and engine-provided features into one context
// refine context.system

const application = (function () {
  // notes: everything inside `application` is function, except `debug`, whose content is also function
  // so the forward declaration is actually unnecessary
  // however a conclusion-like section at the end of module is always helpful, so keeps it unchanged for now
  let application  // forward declaration of `this`
  // control exposed interface
  let menuApplicationDelegate
  let engineApplicationDelegate
  let publicApplicationDelegate

  // notes: then why delegates are created here while `application` is collected at the end?
  function CreateDelegate () {
    menuApplicationDelegate = {
      ForEachGame: application.ForEachGame,
      PauseGame: application.PauseGame,
    }
    engineApplicationDelegate = {
      OnGameUpdate: application.OnGameUpdate,
      AfterFrame: application.AfterFrame,
      debug: application.debug,
    }
    publicApplicationDelegate = {
      RegisterGame: application.RegisterGame,
      OnReady: application.OnReady,
      debug: application.debug,
    }
  }

  // constant states that do not change during the whole application lifetime
  const gameList = []
  const menu = new Menu()
  const engineFeatureTagList = Engine.featureTagList
  const debug = {
    throttleTimeout: null,
  }

  // session states, reset on every new session
  const session = {
    game: null,
    data: null,
    engine: null,
    lastFrame: 0.0,
    lastUpdateFps: 0.0,
    numberMillisecond: 0.0,
    numberFrame: 0,
    numberFrameSinceLastUpdateFps: 0,
  }

  // application states, permanent cross sessions
  let replaceEngineBeforeResume = false
  let paused = false  // paused iff menu modal is showing

  // states declaration end

  function RegisterGame (game) {
    gameList.push(game)
  }

  function GetContextStat (timeStamp) {
    return {
      timeStamp,
      numberMillisecond: session.numberMillisecond,
      numberFrame: session.numberFrame,
    }
  }

  function HideMenuModal () {
    // assert paused
    paused = false
    menu.HideModal()
  }

  function ShowMenuModal () {
    // assert not paused
    paused = true
    menu.UpdateGameList(menuApplicationDelegate)
    menu.ShowModal()
  }

  function ResumeGame () {
    console.log('[App] resume the game')
    const timeStamp = performance.now()
    session.lastFrame = timeStamp
    session.lastUpdateFps = timeStamp
    session.numberFrameSinceLastUpdateFps = 0

    const hasPreFrame = replaceEngineBeforeResume
    if (replaceEngineBeforeResume) {
      session.engine.CleanUp()
      session.engine = new Engine()
      session.engine.SetUp({
        aspectRatio: session.game.aspectRatio,
        contextRevision: session.game.contextRevision,
      })
      const redrawContext = session.engine.GetRedrawContext(GetContextStat(timeStamp))
      session.game.interface.Redraw(redrawContext, session.data)
      replaceEngineBeforeResume = false
    }
    session.engine.Start(engineApplicationDelegate, hasPreFrame)
  }

  function StartGame (game) {
    console.log(`[App] start game ${game.name}`)
    const timeStamp = performance.now()
    if (replaceEngineBeforeResume) {
      session.engine.CleanUp()
      replaceEngineBeforeResume = false
    }
    session.game = game
    session.data = game.interface.Create()
    session.engine = new Engine()
    session.engine.SetUp({
      aspectRatio: session.game.aspectRatio,
      contextRevision: session.game.contextRevision,
    })
    session.lastFrame = timeStamp
    session.lastUpdateFps = timeStamp
    session.numberMillisecond = 0.0
    session.numberFrame = 0
    session.numberFrameSinceLastUpdateFps = 0

    const redrawContext = session.engine.GetRedrawContext(GetContextStat(timeStamp))
    session.game.interface.Redraw(redrawContext, session.data)
    session.engine.Start(engineApplicationDelegate, true)
  }

  function ForEachGame (consumer) {
    function CreateOnSelect (game) {
      return function () {
        console.log(`[App] game ${game.name} is selected`)
        menu.SetGameName(game.name)
        if (session.game === game) {
          ResumeGame()
        } else {
          if (session.game) {
            replaceEngineBeforeResume = true
          }
          StartGame(game)
        }
        HideMenuModal()
      }
    }

    function RejectSelected () {
      throw new Error('Game is not selectable')
    }

    for (let game of gameList) {
      const running = session.game === game
      // need ES7 for `includes` method
      const supported = game.featureTagList.every(function (tag) {
        return engineFeatureTagList.includes(tag)
      }) && engineFeatureTagList.includes(`context:${game.contextRevision}`)
      consumer({
        name: game.name,
        description: game.description,
        Select: supported ? CreateOnSelect(game) : RejectSelected,
        running,
        supported,
      })
    }
  }

  function DebugSetThrottle (maxFps) {
    debug.throttleTimeout = 1000.0 / maxFps
  }

  function GetDebugThrottleTimeout () {
    return debug.throttleTimeout
  }

  function OnReady () {
    console.log('[App] on ready')
    menu.CreateElement(menuApplicationDelegate)
    menu.AttachElement()
    // hold back a little to enable animation
    setTimeout(function () {
      menu.ShowModal()
      document.querySelector('#loading-text').remove()
    }, 100)
    paused = true  // the only one manually pause

    window.addEventListener('resize', function () {
      replaceEngineBeforeResume = true
      PauseGame()
    })
    window.addEventListener('blur', function () {
      PauseGame()
    })
  }

  function PauseGame () {
    if (paused) {
      return
    }
    console.log('[App] pause the game')
    session.engine.Stop()
    ShowMenuModal()
  }

  function OnGameUpdate (timeStamp) {
    const onFrameContext = session.engine.GetOnFrameContext(GetContextStat(timeStamp))
    session.data = session.game.interface.OnFrame(onFrameContext, session.data)
  }

  function AfterFrame (timeStamp) {
    session.numberFrame += 1
    session.numberFrameSinceLastUpdateFps += 1
    session.numberMillisecond += timeStamp - session.lastFrame
    session.lastFrame = timeStamp
    if (session.lastFrame - session.lastUpdateFps >= 1000.0) {
      menu.SetFps(session.numberFrameSinceLastUpdateFps)
      session.lastUpdateFps = session.lastFrame
      session.numberFrameSinceLastUpdateFps = 0
    }
  }

  // noinspection JSUnusedGlobalSymbols
  const debugInterfaces = {
    SetThrottle: DebugSetThrottle,
    GetThrottleTimeout: GetDebugThrottleTimeout,
  }

  application = {
    RegisterGame,
    ForEachGame,
    OnReady,
    PauseGame,
    OnGameUpdate,
    AfterFrame,
    debug: debugInterfaces,
  }
  CreateDelegate()
  return publicApplicationDelegate
})()
