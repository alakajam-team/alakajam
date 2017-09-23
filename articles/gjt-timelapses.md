Timelapses
* [Why?](#why)
* [Preparation](#preparation)
    * [Length](#length)
    * [Disk space](#disk)
    * [Desktop, workflow, pauses](#desktop)
* [Recording](#recording)
    * [Cross-platform (including Linux)](#rec-cross)
    * [Windows](#rec-win)
    * [Mac OS X](#rec-osx)
* [Music](#music)
* [Encoding](#encoding)
    * [Cross-platform (including Linux)](#enc-cross)
    * [Windows](#enc-win)
    * [Mac OS X](#enc-osx)
* [Uploading](#uploading)

## <a name="why"></a>Why?

Timelapses are a great way to share your game creation process with other people. A video capturing the many hours you have put into your game can be entertaining to watch, but also educational and inspirational for people who want to improve their workflows or game development process. Publishing a timelapse video for your game can also improve your visibility.

Note: Even though the rules of Alakajam! require you to make your game in 48 hours (or 72), it is not required of you to provide a timelapse as proof!

In general, there are two steps to creating a timelapse video - recording and encoding. Some programs can do both at the same time, but it is usually easier to record your timelapse separately into individual frames, then encode the frames into a video in a single pass.

## <a name="preparation"></a>Preparation

Before you start recording your timelapse, you should decide what the finished video should be like.

### <a name="length"></a>Length

Some jammers like to keep their timelapses on the short side (5 minutes), but it is not uncommon to see longer videos (20 minutes), especially if it captures many hours, which might be the case with jam entries. People might not have the patience to finish watching a very long timelapse video, but if you make it too short, the video might be too fast for anybody to see what is going on. If you plan to watch the timelapse on your own to see your progress, feel free to make a longer timelapse. It is always possible to make the resulting video shorter, see Preparation - Disk space.

There are three things that decide the length of your final video:

 - Time recording - Recording for a longer time means a longer video, of course.
 - Interval between frames - How many seconds between individual screen captures.
 - Framerate of video - The resulting video will play back several frames per second. (For YouTube, this would generally be either 24, 30, or 60)

The estimated length of your timelapse in seconds is:

    (time recording in seconds) / (interval in seconds) / (framerate in frames per second)

Example: recording for an hour with 3 seconds between frames will result in 40 seconds of 30 fps video footage.

Alternatively:

    (frames recorded) / (framerate in frames per second)

### <a name="disk"></a>Disk space

It's important to consider the practical aspects of recording a timelapse. While the resulting video will generally relatively small (a full HD video can be a couple of hundreds of megabytes at most, if encoded correctly), the recording itself generally uses individual image files. Raw timelapse footage can take up gigabytes of disk space (although the specifics depend a lot on your recording resolution, the program you are using, the interval between frames, etc.). Consider clearing up a bit of space so that your recording doesn't slow down your machine too much. A test run can give you an estimate of what to expect.

### <a name="desktop"></a>Desktop, workflow, pauses

Your timelapse video might show your desktop, the tools you're using, your IRL workplace (if you use a webcam). Cleaning everything up and having a well-organised workflow will result in a neater timelapse.

Some people like to record the entire 48 hours (or 72 hours) of the event, including any time they are not at their desk, when they are sleeping, eating, etc. While this makes the resulting video reflect the process more accurately, it is not advisable to do this unless you are ready to work on your game for a very significant portion of the duration of the jam. Some additional video editing is also advisable, e.g. showing footage from your game when there is nothing happening in the timelapse.

If you want to comment on what is happening at any given moment, you could do this in post-processing (keeping a log or using git to track your commits helps to remember), or you could simply put a text editor with a big font setting on the screen.

## <a name="recording"></a>Recording

### <a name="rec-cross"></a>Cross-Platform (including Linux)

* [Chronolapse](https://github.com/collingreen/chronolapse) - a tool made by a Ludum Dare jammer for recording and editing timelapses, allows some amount of light post processing. Tutorial: https://www.youtube.com/watch?v=f2ouAcfKHt4
* [OBS Studio](https://obsproject.com/) - a tool mostly for streaming videos, can be set to record one frame per second.

### <a name="rec-win"></a>Windows

* [ShareX](https://getsharex.com/) - a tool for easy video/gif captures.
* [CamStudio](http://camstudio.org/) - a tool for streaming and timelapses.

### <a name="rec-osx"></a>Mac OS X

* [shkit](https://github.com/Aurel300/shkit) - a set of tools for the Mac terminal, includes `tl` for recording timelapses.
* [ScreenFlick](http://www.araelium.com/screenflick/) - a tool for "fast screen recording", allows remote control.

## <a name="music"></a>Music

After finishing the recording of your timelapse, you should know how long the resulting video will be (see Preparation - Length). Now you should select a playlist of music - this will make the video much more interesting to watch. A silent timelapse video feels unfinished.

But be careful about copyright laws! Only use your own music (if you made music for your game, it might be the ideal choice!), or music that you have the permission to use. Using commercial tracks and uploading the video on YouTube will most likely result in the sound being blocked on your video. If you need music, you should ask fellow jammers or artists who would like to gain some recognition. And there are always royalty-free options:

* [Free Music Archive](http://freemusicarchive.org/)
* [Incompetech](https://incompetech.com/music/royalty-free/music.html)
* [YouTube Audio Library](https://www.youtube.com/audiolibrary/music)
* [MOD archive](https://modarchive.org/)
* [Public Domain Music](http://www.pdmusic.org/)
* [Jamendo](https://www.jamendo.com/)

## <a name="encoding"></a>Encoding

### <a name="enc-cross"></a>Cross-Platform (including Linux)

* [Chronolapse](https://github.com/collingreen/chronolapse) - a tool for recording and editing timelapses, allows some amount of light post processing. Tutorial: https://www.youtube.com/watch?v=f2ouAcfKHt4
* [ffmpeg](http://ffmpeg.org/) - a very versatile command-line tool for video editing and encoding. Tutorial: http://hamelot.io/visualization/using-ffmpeg-to-convert-a-set-of-images-into-a-video/
* [Blender](https://www.blender.org/) - a 3D editor at heart, Blender has video editing capabilities suitable for creating timelapses using a GUI. Tutorial: https://www.youtube.com/playlist?list=PLjyuVPBuorqIhlqZtoIvnAVQ3x18sNev4

### <a name="enc-win"></a>Windows

* [VirtualDub](http://virtualdub.sourceforge.net/) - GUI-based video editor and encoder. Tutorial: http://timelapseblog.com/2009/08/04/using-virtualdub-for-time-lapse/
* Windows Movie Maker - a video editing tool that comes with Windows. Tutorial: http://timelapseblog.wordpress.com/2009/07/21/using-windows-movie-maker-for-time-lapse/
* [Adobe After Effects](https://www.adobe.com/products/aftereffects.html) (commercial) - a versatile video editor, allows importing footage, advanced video post-processing and encoding.

### <a name="enc-osx"></a>Mac OS X

* [Adobe After Effects](https://www.adobe.com/products/aftereffects.html) (commercial) - a versatile video editor, allows importing footage, advanced video post-processing and encoding.

## <a name="uploading"></a>Uploading

The Alakajam! website does not provide hosting for games or videos, so you will have to find a different place to host your finished timelapse.

* [YouTube](https://youtube.com/) is the most popular choice for hosting timelapse videos. Creating an account is quick and free.
