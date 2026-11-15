---
id: "33333333-3333-3333-3333-333333333333"
title: "QML Object Model, Properties, Signals, and Bindings"
ecosystem: "qt-qml"
category: "properties"
versions: ["6.8", "6.12"]
sources:
  - url: "https://doc.qt.io/qt-6/qtqml-syntax-objectattributes.html"
    title: "Qt 6 QML Object Attributes"
    ecosystem: "qt-qml"
    versionApplicability: ">=6.0"
    retrieved: "2026-11-15T00:00:00Z"
    license: "GFDL 1.3"
    verificationState: "official"
  - url: "https://doc.qt.io/qt-6/qtqml-syntax-propertybinding.html"
    title: "Qt 6 QML Property Binding"
    ecosystem: "qt-qml"
    versionApplicability: ">=6.0"
    retrieved: "2026-11-15T00:00:00Z"
    license: "GFDL 1.3"
    verificationState: "official"
  - url: "https://doc.qt.io/qt-6/qtqml-syntax-signals.html"
    title: "Qt 6 QML Signals and Handlers"
    ecosystem: "qt-qml"
    versionApplicability: ">=6.0"
    retrieved: "2026-11-15T00:00:00Z"
    license: "GFDL 1.3"
    verificationState: "official"
  - url: "https://doc.qt.io/qt-6/qtqml-cppintegration-topic.html"
    title: "Qt 6 C++ Integration with QML"
    ecosystem: "qt-qml"
    versionApplicability: ">=6.0"
    retrieved: "2026-11-15T00:00:00Z"
    license: "GFDL 1.3"
    verificationState: "official"
status: "verified"
lastVerified: "2026-11-15T00:00:00Z"
tags: ["qml", "properties", "signals", "bindings", "object-model", "qt6"]
checksum: "sha256:placeholder"
---

# QML Object Model, Properties, Signals, and Bindings

## Explanation

Qt Quick's QML (Qt Modeling Language) is a declarative language for designing user interfaces. The QML object model is based on a tree of `QtObject`-derived elements, each with properties, signals, methods, and child objects.

**Core concepts:**
- **QtObject**: Base type for all QML objects; provides `objectName`, `parent`, `children`
- **Properties**: Typed values (int, real, bool, string, color, url, variant, list, object) with change notification
- **Signals**: Event notifications emitted by objects; connected via signal handlers (`onSignalName`)
- **Bindings**: Declarative relationships between properties; automatically update when dependencies change
- **Property aliases**: Forward a property from one object to another
- **Grouped properties**: Organize related properties under a namespace

## Patterns

### Basic Object with Properties

Context: Declaring typed properties on a QML object
```qml
import QtQuick

Item {
    id: root
    width: 400
    height: 300

    // Property declarations with types
    property int count: 0
    property real opacity: 1.0
    property bool enabled: true
    property string title: "Hello"
    property color backgroundColor: "#1e1e2e"
    property url iconSource: "qrc:/icons/app.png"
    property variant userData: null
    property list<Item> childItems: []
    property Item contentItem: null

    // Read-only property (computed)
    readonly property int doubleCount: count * 2

    // Property with change signal handler
    property int value: 0
    onValueChanged: console.log("Value changed to:", value)
}
```

### Property Aliases and Grouped Properties

Context: Exposing internal properties and organizing related properties
```qml
import QtQuick

Rectangle {
    id: button
    width: 120
    height: 40
    radius: 6

    // Grouped properties for organization
    property group FontMetrics {
        property int pixelSize: 14
        property bool bold: false
        property string family: "Inter"
    }

    // Aliases to internal child properties
    property alias text: label.text
    property alias textColor: label.color
    property alias fontSize: label.font.pixelSize

    // Internal implementation
    Text {
        id: label
        anchors.centerIn: parent
        font.family: button.FontMetrics.family
        font.pixelSize: button.FontMetrics.pixelSize
        font.bold: button.FontMetrics.bold
    }
}

// Usage
Button {
    text: "Click Me"
    textColor: "white"
    fontSize: 16
    FontMetrics.pixelSize: 16  // Access grouped property
    FontMetrics.bold: true
}
```

### Signal Declaration and Emission

Context: Defining custom signals and emitting them
```qml
import QtQuick

Item {
    id: counter
    property int value: 0

    // Custom signal with parameters
    signal valueChanged(int newValue, int oldValue)
    signal thresholdReached(int threshold)
    signal reset()

    function increment() {
        let old = value
        value++
        valueChanged(value, old)

        if (value >= 100) {
            thresholdReached(100)
        }
    }

    function decrement() {
        let old = value
        value--
        valueChanged(value, old)
    }

    function resetCounter() {
        value = 0
        reset()
    }
}

// Connecting to signals
Counter {
    id: myCounter
    onValueChanged: console.log("Changed:", newValue, "from:", oldValue)
    onThresholdReached: Notification.send("Threshold", "Reached " + threshold)
    onReset: console.log("Counter reset")
}
```

### Property Bindings

Context: Declarative property relationships that update automatically
```qml
import QtQuick

Rectangle {
    id: container
    width: 400
    height: 300
    color: "#1e1e2e"

    // Simple binding - updates automatically when width changes
    property int halfWidth: container.width / 2

    // Binding with ternary operator
    property color indicatorColor: container.width > 300 ? "green" : "red"

    // Binding to child property
    property real childOpacity: innerRect.opacity

    // Binding with function call
    property string statusText: computeStatus(container.width, container.height)

    // Conditional binding using Binding element
    Binding {
        target: innerRect
        property: "color"
        value: container.enabled ? "blue" : "gray"
        when: container.enabled !== undefined
    }

    Rectangle {
        id: innerRect
        width: container.halfWidth
        height: 100
        anchors.centerIn: parent
        color: container.indicatorColor
    }

    function computeStatus(w, h) {
        return w > h ? "Landscape" : "Portrait"
    }
}
```

### Binding vs Assignment

Context: Understanding the difference between bindings and one-time assignments
```qml
import QtQuick

Item {
    width: 200
    height: 200

    property int a: 10
    property int b: 20

    // BINDING: c updates when a or b changes
    property int c: a + b

    // ASSIGNMENT: d is set once, does not update
    property int d: a + b  // This is actually a binding in QML!

    // To do one-time assignment, use a function or Component.onCompleted
    property int e: 0
    Component.onCompleted: {
        e = a + b  // One-time assignment
    }

    // Binding with explicit Binding element (for conditional bindings)
    Binding {
        target: someObject
        property: "value"
        value: a * 2
        when: someCondition
    }
}
```

### Connections Element for External Signals

Context: Connecting to signals from arbitrary objects
```qml
import QtQuick

Item {
    id: observer

    // Connect to signals from arbitrary objects
    Connections {
        target: someExternalObject
        onDataChanged: {
            console.log("External data changed:", newData)
        }
        onError: (msg) => {
            console.error("Error:", msg)
        }
    }

    // Connect to multiple targets
    Connections {
        target: [model1, model2]
        onRowsInserted: updateView()
        onRowsRemoved: updateView()
    }
}
```

## Examples

### Reusable Custom Component with Properties and Signals

Runnable: false
```qml
// ToggleSwitch.qml
import QtQuick
import QtQuick.Controls

Button {
    id: toggle
    checkable: true
    checked: false
    width: 60
    height: 30

    property alias checked: toggle.checked
    property color onColor: "#89b4fa"
    property color offColor: "#585b70"
    property color thumbColor: "white"

    signal toggled(bool checked)

    background: Rectangle {
        radius: height / 2
        color: toggle.checked ? toggle.onColor : toggle.offColor
        implicitWidth: 60
        implicitHeight: 30
    }

    contentItem: Item {
        implicitWidth: 60
        implicitHeight: 30

        Rectangle {
            id: thumb
            width: parent.height - 6
            height: parent.height - 6
            radius: width / 2
            color: toggle.thumbColor
            x: toggle.checked ? parent.width - width - 3 : 3
            y: 3
            Behavior on x {
                SpringAnimation { spring: 2; damping: 0.8 }
            }
        }
    }

    onCheckedChanged: toggled(checked)
}
```

### Binding with Complex Expressions

Runnable: false
```qml
import QtQuick

Item {
    width: 400
    height: 300

    property real scaleFactor: 1.0
    property bool darkMode: true
    property int itemCount: 5

    // Complex binding with multiple dependencies
    property color dynamicColor: {
        if (itemCount === 0) return "red"
        if (itemCount < 3) return darkMode ? "#f38ba8" : "#e64553"
        if (itemCount < 10) return darkMode ? "#fab387" : "#df8e1d"
        return darkMode ? "#a6e3a1" : "#40a02b"
    }

    // Binding to C++ model property (if exposed)
    // property int cppModelCount: cppModel.count

    // Lazy binding - only evaluates when needed
    property var expensiveComputation: Binding {
        target: this
        property: "result"
        value: computeExpensiveValue(itemCount, scaleFactor)
        when: itemCount > 0
    }

    function computeExpensiveValue(count, scale) {
        // Simulate expensive computation
        let result = 0
        for (let i = 0; i < count * 1000; i++) {
            result += Math.sin(i * scale)
        }
        return result
    }
}
```

## Mistakes

### Using Equals Instead of Colon for Property Assignment
Problem: Syntax error
Solution: Use `property int x: 10` not `property int x = 10`
Severity: error

### Forgetting Property Keyword
Problem: Variable not exposed as property
Solution: Always declare with `property <type> name: value`
Severity: error

### Circular Property Bindings
Problem: Infinite loop, stack overflow
Solution: Avoid A binds to B binds to A; use `Binding { when: }`
Severity: error

### Binding to Non-Existent Property
Problem: Silent failure, undefined behavior
Solution: Verify property names; use Qt Creator inspector
Severity: warning

### Overusing property variant
Problem: Loses type safety, harder to debug
Solution: Use specific types (int, real, string, color, etc.)
Severity: warning

### Missing onPropertyChanged Handler for Custom Signals
Problem: Signal not connected
Solution: Handler name must be `on` + PropertyName + `Changed`
Severity: error

### Using JavaScript Equals in Binding Context
Problem: Creates assignment not binding
Solution: In property declarations, `:` creates binding; `=` in JS creates assignment
Severity: warning

### Not Marking Read-Only Computed Properties
Problem: Unnecessary change notifications
Solution: Use `readonly property` for computed values
Severity: warning

### Binding to Children List Directly
Problem: List changes don't trigger bindings
Solution: Use `property list<Item> items: []` and manage manually
Severity: warning

## Compatibility

### property keyword
Introduced: Qt 5.0
Notes: Core QML

### readonly property
Introduced: Qt 5.15
Notes: Qt 6: fully supported

### property alias
Introduced: Qt 5.0
Notes: Forward properties

### property group
Introduced: Qt 6.0
Notes: Grouped properties

### signal keyword
Introduced: Qt 5.0
Notes: Custom signals

### Connections element
Introduced: Qt 5.0
Notes: Signal connections

### Binding element
Introduced: Qt 5.0
Notes: Conditional bindings

### Behavior on property
Introduced: Qt 5.0
Notes: Animation on change

### Q_PROPERTY (C++)
Introduced: Qt 4.0
Notes: Expose C++ properties

### Q_INVOKABLE (C++)
Introduced: Qt 4.0
Notes: Call C++ from QML

### QML_ELEMENT macro
Introduced: Qt 6.0
Replacement: qmlRegisterType
Notes: Auto-registration

## Performance

### Binding overhead
Impact: high
Description: Each binding creates a dependency tracker
Mitigation: Minimize bindings in hot paths (e.g., 60fps animations)

### Property change propagation
Impact: medium
Description: Changing a property notifies all bound properties
Mitigation: Batch changes when possible

### variant type cost
Impact: medium
Description: property variant disables compile-time optimization
Mitigation: Use specific types

### Connections vs onSignal
Impact: low
Description: onSignal handler on target object is faster than Connections element
Mitigation: Prefer onSignal handlers when possible

### Binding evaluation
Impact: low
Description: Bindings evaluate lazily (on access)
Mitigation: Avoid side effects in binding expressions

### readonly properties
Impact: low
Description: Skip change notification overhead
Mitigation: Use for computed values

## Debugging

### Property not updating
Cause: Binding not created or circular
Diagnosis: Check binding syntax; verify dependencies
Resolution: Fix binding expression; break cycles
Tools: Qt Creator QML Inspector

### Signal handler not called
Cause: Wrong handler name (onXxxChanged)
Diagnosis: Verify signal name matches `on` + Signal + `Changed`
Resolution: Rename handler to match convention
Tools: Console logging

### Binding loop warning
Cause: Circular dependency
Diagnosis: "QML Binding loop detected" in console
Resolution: Restructure bindings; use `Binding { when }`
Tools: QT_QML_DEBUG=1

### Slow UI / jank
Cause: Too many bindings / complex expressions
Diagnosis: Profile with QML Profiler
Resolution: Reduce binding count; simplify expressions
Tools: QT_QML_PROFILER=1

### C++ property not visible in QML
Cause: Missing Q_PROPERTY or QML_ELEMENT
Diagnosis: Check C++ class registration
Resolution: Add Q_PROPERTY, QML_ELEMENT, register module
Tools: qmllint

### property alias not working
Cause: Alias target not initialized
Diagnosis: Alias target must exist at creation
Resolution: Ensure target object created before alias
Tools: Check component completion

## References

- [Qt 6 QML Object Attributes](https://doc.qt.io/qt-6/qtqml-syntax-objectattributes.html) (official)
- [Qt 6 QML Property Binding](https://doc.qt.io/qt-6/qtqml-syntax-propertybinding.html) (official)
- [Qt 6 QML Signals and Handlers](https://doc.qt.io/qt-6/qtqml-syntax-signals.html) (official)
- [Qt 6 C++ Integration with QML](https://doc.qt.io/qt-6/qtqml-cppintegration-topic.html) (official)
- [Qt 6 QML Reference](https://doc.qt.io/qt-6/qmlapplications.html) (official)