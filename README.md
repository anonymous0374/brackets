# bracket.js is an simple data binding library(only works  with IE9+)

# The core feature of bracket.js
  brackets.js is an simple data binding library. It can render a piece of HTML
source code with a JSON object as data, and it can also collect the status of
elements within a piece of HTML segament, and organize them into a JSON object.

# How brackets.js does its job
  brackets.js has a collection of custom attributes, the developer can assign 
those custom attritues to a section of HTML elements.
  brackets.js works via two process: HTML rendering, and HTML status
persisting.
  During the process of rendering, brackets.js maps a JSON object as data into
the value attributes of those elements by analysing the custom attritutes of
those elements.
  During the process of persisting, brackets.js walks through elements that
have certain custom attributes, it get the current status of each HTML element
and forms orgainze those status into an JSON object, and send it to the 
backend.
 
