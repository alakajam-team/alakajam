Markdown guide
Alakajam! posts and comments allow you to use [Markdown](https://daringfireball.net/projects/markdown/) formatting. Markdown has a very simple syntax and allows you to add emphasis, sections, images, and more to your content. The editor that displays above Markdown-enabled text areas lets you insert the special syntax with the click of a button, but we are including this guide for reference.

* [Emphasis](#emphasis)
* [Headers](#headers)
* [Lists](#lists)
* [Links](#links)
* [Quotes](#quotes)
* [Images](#images)
* [Tables](#tables)
* [Displaying code](#code)
* [Mentions](#mentions)
* [Progress bars](#progress)

While cannot use arbitrary **HTML code** in Alakajam! posts and comments, some tags (and classes) are allowed:

* [Embeds](#embeds)
* [Images](#images)
* [Spoilers](#spoilers)
* [Alignment](#alignment)
* [Buttons](#buttons)

## <a name="emphasis"></a>Emphasis ##

#### Code ####

    **bold**
    *italics*
    ~~strikethrough~~

#### Result ####

**bold**
*italics*
~~strikethrough~~

## <a name="headers"></a>Headers ##

#### Code ####

    # Big header
    ## Medium header
    ### Small header
    #### Tiny header

## <a name="lists"></a>Lists ##

#### Code ####

    * Generic list item
    * Generic list item
    * Generic list item
    
    1. Numbered list item
    2. Numbered list item
    3. Numbered list item

#### Result ####

* Generic list item
* Generic list item
* Generic list item

1. Numbered list item
2. Numbered list item
3. Numbered list item

## <a name="links"></a>Links ##

#### Code ####

    [Text to display](http://www.example.com)

#### Result ####

[Text to display](http://www.example.com)

## <a name="quotes"></a>Quotes ##

#### Code ####

    > This is a quote.
    > It can span multiple lines!

#### Result ####

> This is a quote.
> It can span multiple lines!

## <a name="images"></a>Images ##

#### Code ####

    ![](https://alakajam.com/static/images/favicon32.png)

#### Result ####

![](https://alakajam.com/static/images/favicon32.png)

## <a name="tables"></a>Tables ##

#### Code ####

    | Column 1 | Column 2 | Column 3 |
    | -------- | -------- | -------- |
    | John     | Doe      | Male     |
    | Mary     | Smith    | Female   |
    
    | Even | without | proper |
    | --- | --- | --- |
    | alignment | this | will |
    | be | a | table. |

#### Result ####

| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| John     | Doe      | Male     |
| Mary     | Smith    | Female   |

| Even | without | proper |
| --- | --- | --- |
| alignment | this | will |
| be | a | table. |

## <a name="code"></a>Displaying code ##

#### Code ####

    Inline code: `alakajam.bang();`
    
    ```
    var alakajam = JamBuilder.buildJam('alaka');
    alakajam.bang();
    ```
    
        var kajam = JamBuilder.buildJam('ka');
        kajam.noBang();

#### Result ####

Inline code: `alakajam.bang();`

```
var alakajam = JamBuilder.buildJam('alaka');
alakajam.bang();
```

    var kajam = JamBuilder.buildJam('ka');
    kajam.noBang();

## <a name="mentions"></a>Mentions ##

#### Code ####

    Hello, @wan!

#### Result ####

Hello, @wan!



## <a name="embeds"></a>Embeds ##

The `<iframe>` tag is allowed from whitelisted hosts:

* `gfycat.com`
* `vimeo.com`
* `youtube.com`

You can use this to embed media in your post.

## <a name="images"></a>Images ##

Allowed attributes are:

* `src`
* `width`
* `height`
* `class` (allowed values: `pull-left`, `pull-right`)

#### Code ####

    <img src="https://alakajam.com/static/images/logo.png" class="pull-right" width="50" />
    This is a paragraph of text with an image on the right. This is a paragraph of text with an image on the right. This is a paragraph of text with an image on the right.

#### Result ####
<img src="https://alakajam.com/static/images/logo.png" class="pull-right" width="50" />
This is a paragraph of text with an image on the right. This is a paragraph of text with an image on the right. This is a paragraph of text with an image on the right. 

## <a name="spoilers"></a>Spoilers ##

#### Code ####

    <p class="spoiler">Trinity snapes Tyler Durden!</p>

#### Result ####

<p class="spoiler">Trinity snapes Tyler Durden!</p>

## <a name="alignment"></a>Alignment ##

#### Code ####

    <p class="text-left">Unnecessary?</p>
    
    <p class="text-center">Important!</p>
    
    <p class="text-right">Weird …</p>

#### Result ####

<p class="text-left">Unnecessary?</p>

<p class="text-center">Important!</p>

<p class="text-right">Weird …</p>


#### Code ####

    <p class="indent">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed auctor dictum elit, vitae fringilla eros iaculis at. Proin scelerisque enim finibus quam sollicitudin, in molestie neque convallis. Proin pretium placerat dignissim. Sed ligula nibh, ornare id tempor vitae, pellentesque ut est. Aenean in ex non augue consequat dictum sed sit amet felis. Donec eu odio eget diam bibendum tempor. Proin porttitor nec turpis vitae viverra.</p>

#### Result ####

<p class="indent">Lorem ipsum dolor sit Alakajam, consectetur adipiscing elit. Sed auctor dictum elit, vitae fringilla eros iaculis at. Proin scelerisque enim finibus quam sollicitudin, in molestie neque convallis. Proin pretium placerat dignissim. Sed ligula nibh, ornare id tempor vitae, pellentesque ut est. Aenean in ex non augue consequat dictum sed sit amet felis. Donec eu odio eget diam bibendum tempor. Proin porttitor nec turpis vitae viverra.</p>

## <a name="buttons"></a>Buttons ##

#### Code ####

    <a href="#buttons" class="btn btn-default">Normal button</a>    
    <a href="#buttons" class="btn btn-primary">Important button</a>

#### Result ####

<a href="#buttons" class="btn btn-default">Normal button</a>    
<a href="#buttons" class="btn btn-primary">Important button</a>

## <a name="progress"></a>Progress bars ##

#### Code ####

    <progress max="100" value="40"></progress>

#### Result ####

<progress max="100" value="40"></progress>
