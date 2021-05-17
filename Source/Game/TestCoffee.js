// Generated by CoffeeScript 2.5.1
(function() {
  // TestCoffee.coffee - The test game, CoffeeScript version
  var $UpdateEventDescriptionText, Create, GetNumberEventText, GetSystemTimeText, OnFrame, Redraw;

  Create = function() {
    console.log('[TestCoffee] create game');
    return {
      // initial states
      numberEvent: 0,
      numberSecond: 0
    };
  };

  GetSystemTimeText = function(context) {
    return `System time: ${context.system.numberMillisecond.toFixed(2)}ms`;
  };

  GetNumberEventText = function(numberEvent) {
    return `Number of events: ${numberEvent}`;
  };

  Redraw = function(context, data) {
    var textCommon;
    console.log('[TextCoffee] redraw game');
    textCommon = {
      x: 0.0,
      fontSize: 0.03,
      fontFamily: 'Lato',
      fill: 'black'
    };
    // no elegant way to remove parentheses after Create, what a pity for junkrat revision
    context.Create('text%system-time%0').Text({
      y: 0.0,
      text: GetSystemTimeText(context),
      eventList: ['click'],
      ...textCommon
    });
    context.Create('text%event-description%0').Text({
      y: 0.04,
      text: "Wait for the first event (since last redraw)",
      ...textCommon
    });
    context.Create('text%number-event%0').Text({
      y: 0.08,
      text: GetNumberEventText(data.numberEvent),
      ...textCommon
    });
    context.Create('stage%%0').Stage({
      eventList: ['keydown']
    });
    return null;
  };

  $UpdateEventDescriptionText = function(context, text) {
    return context.Update('text%event-description%0', {text});
  };

  OnFrame = function(context, data) {
    var numberEvent;
    context.Update('text%system-time%0', {
      text: GetSystemTimeText(context)
    });
    numberEvent = data.numberEvent;
    (function() {      // process at most one event in one frame
      var key;
      numberEvent += 1;
      if (key = context.DequeueEvent('stage%%0', 'keydown')) {
        $UpdateEventDescriptionText(context, `keydown: key = ${key}`);
        return;
      }
      if (context.DequeueEvent('text%system-time%0', 'click')) {
        $UpdateEventDescriptionText(context, 'system time is clicked');
        return;
      }
      // default
      return numberEvent -= 1;
    })();
    if (numberEvent !== data.numberEvent) {
      context.Update('text%number-event%0', {
        text: GetNumberEventText(numberEvent)
      });
    }
    return {
      // updated states
      numberEvent: numberEvent,
      numberSecond: data.numberSecond
    };
  };

  application.RegisterGame({
    name: 'Test Coffee',
    description: 'A testing game written in CoffeeScript',
    aspectRatio: null,
    featureTagList: ['shape:text', 'event:keydown', 'event:click'],
    contextRevision: 'junkrat',
    interface: {Create, Redraw, OnFrame}
  });

}).call(this);

//# sourceMappingURL=TestCoffee.js.map
