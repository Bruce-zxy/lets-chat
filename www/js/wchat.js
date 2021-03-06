var Chat = {
    // 聊天内容
    content : '<div class="item clearfix">'+
    '<div class="pic fl">'+
    '<img src="" alt="pic">'+
    '</div>'+
    '<div class="info_msg">'+
    '<div class="info"><span class="name"></span><span class="timer"></span></div>'+
    '<div class="msg"></div>'+
    '</div>'+
    '</div>',
    $tips : $('<div class="tips clearfix"><div><em>!</em><span></span></div></div>'),

    userid : null, // 当前用户
    visible: true, // 用户是否离开当前标签页
    
    // 聊天窗口震动
    shake : {
        num : 0,    // 震动次数
        next : 0,   // 下次震动的时间
        getNext : function(timestamp){
            this.num++;
            this.next = timestamp + 5000*this.num;
        },
        getDiff : function(){
            return 5000*this.num;
        }
    },

    // 警告提示
    warning : function(string){
        this.$tips.find('span').html(string);
        $(".record").find('.list').append(this.$tips);
    },

    // 发送消息
    send : function(){
        var msg = $.trim($("#msg").val());
        if(msg===""){
            return;
        }
        if(this.userid==null){
            this.warning("您还没有登陆");
        }else{
            $("#msg").val("").focus();
            socket.emit("message", {msg:msg, color:$('#fontcolor').val(), size:$("#fontsize").val()}, this.userid);
        }
    },

    // 接收消息
    appendMsg : function(result){
        if(result.status=="success"){
            var info = result.info;
            var $content = $(this.content);

            this.userid==info.uid && $content.addClass( 'louzhu' );
            $content.find('img').attr('src', info.img);
            $content.find('.name').html(info.nickname);
            $content.find('.timer').html(info.time);
            $content.find('.msg').html(info.msg);

            $(".record").find('.list').append($content);
            this.scroll();
        }else{
            this.warning("认证失败");
        }
    },

    // 滚动条永远在最下
    scroll : function(){
        $(".record").scrollTop($(".record").find('.list').height());
    },

    // 登陆
    login : function(){
        var nickname = $("#nickname").val();
        if(nickname===""){
            return false;
        }
        var $img = $(".portrait .selected").find("img");
        socket.emit("login", {nickname:nickname, img:$img.attr("src")});
        return false;
    },

    // 新用户登录时展示要选择的头像
    formImg:function(n){
        var html = '',
            n = n || 6;
        for(var i=0; i < n; i++){
            if(i==0){
                html += '<li class="selected"><img src="./images/'+i+'.jpg" alt="pic"></li>';
            }else{
                html += '<li><img src="./images/'+i+'.jpg" alt="pic"></li>';
            }
        }
        $(".portrait").html(html);
    },

    // 新消息到来时的title闪烁
    blinkTitle : function(title, timeout){
        var self = this;
        var timer = null;
        var backup = document.title;

        self.start = function(){
            self.stop();

            function blink(){
                document.title = document.title == backup? self.title : backup;
            }
            blink();
            timer = setInterval(blink, self.timeout);
        }

        self.stop = function(){
            if(timer != null){
                document.title = backup;
                clearInterval(timer);
                timer = null;
            }
        }

        self.init = function(title, timeou){
            if(title != undefined){
                self.title = title;
            }
            self.timeout = timeout == undefined? 600: timeout;
        }

        self.init(title, timeout);
    }
}

var socket = io.connect(null);
var blink = new Chat.blinkTitle("【您有新消息...】", 80);

socket.on("connect", function(){
    $("#content").find('.info').html('connect success').hide(function(){
        $("#content").find('.nickform').show();
    });
});

socket.on("nickExisted", function(){
    $('#tips').html('用户名已经存在');
})
socket.on("loginSuccess", function(userid){
    Chat.userid = userid;
    $(".layer").hide();
    $("#content").hide();
    $("#msg").focus();
});

// 接收到系统消息
socket.on("system", function(obj){
    if(obj.type=='login'){
        // 新用户登录提示，同时更新在线用户列表
        var html = '',
            $ul = $(".user").find('ul'),
            user = obj.user;

        $(".record").find('.list').append('<div class="notice">'+obj.nickname+' 已加入</div>');
        for(var key in user){
            html += '<li><a href="javascript:;" class="clearfix" userid="'+user[key].uid+'"><img src="'+user[key].img+'" alt="pic">'+user[key].nickname+'</a></li>';
        }
        $ul.html(html);
        $ul.prepend($ul.find('a[userid='+Chat.userid+']').parent().remove());
        $("#num").html(obj.len);
    }else if(obj.type==='logout'){
        // 用户登出提示，同时更新在线用户列表
        $(".record").find('.list').append('<div class="notice">'+obj.user.nickname+' 已退出</div>');
        $(".user").find('a[userid='+obj.user.userid+']').parent().remove();
        $("#num").html(parseInt($("#num").html())-1);
    }else if(obj.type=='shake'){
        // 震动提示
        $(".record").find('.list').append('<div class="notice">'+obj.user.nickname+' 发送了一个震动</div>');

        $('.main').addClass('shake');
    }
    // 滚动条向下滚动
    Chat.scroll();

    if(!Chat.visible){
        // blink.start();
    }
});

// 接收到其他用户发来的消息
socket.on("msg", function(result){
    Chat.appendMsg(result); // 显示消息

    // 若用户查看的不是当前标签页面，则标题进行闪动
    if(!Chat.visible){
        blink.start();
    }
})

$(function(){
    // 各种浏览器兼容
    var hidden, state, visibilityChange;
    if (typeof document.hidden !== "undefined") {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
        state = "visibilityState";
    } else if (typeof document.mozHidden !== "undefined") {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
        state = "mozVisibilityState";
    } else if (typeof document.msHidden !== "undefined") {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
        state = "msVisibilityState";
    } else if (typeof document.webkitHidden !== "undefined") {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
        state = "webkitVisibilityState";
    }

    // 添加监听器，在title里显示状态变化
    document.addEventListener(visibilityChange, function() {
        if(document[state]=="hidden"){
            Chat.visible = false;
        }else{
            Chat.visible = true;
            blink.stop();
        }
    }, false);

    // 发送消息
    $("#send").click(function(){
        Chat.send($("#msg").val());
    });

    // 新用户选择头像
    $(".portrait").delegate("li", "click", function(){
        var $this = $(this);
        $(this).addClass("selected").siblings().removeClass("selected");
    })

    // ctrl+enter发送消息
    $("#msg").keydown(function(e){
        var code = e.charCode || e.which || e.keyCode;
        var msg = $("#msg").val();
        
        if(e.ctrlKey && code == 13) { 
            $("#msg").val(msg+"\r\n");
        }else if(!e.ctrlKey && code == 13){
            Chat.send(msg);
            e.preventDefault(); 
        }
    });

    // 小工具的显示与隐藏
    $(".font span").on("click", function(){
        var $this = $(this);
        if($this.hasClass( 'selected' )){
            $(".font .fontlist").fadeOut();
            $(".list").removeClass( 'showfont' );
            $this.removeClass( 'selected' );
        }else{
            $(".font .fontlist").fadeIn();
            $(".list").addClass( 'showfont' );
            $this.addClass( 'selected' );
        }
        Chat.scroll();
    });

    // 发送图片
    $("#fileupload").on("change", function(){
        //检查是否有文件被选中
        var $this = $(this),
            files = $this[0].files;
        if (files.length != 0) {
            //获取文件并用FileReader进行读取
            var file = files[0],
                reader = new FileReader();
            if (!reader) {
                Chat.warning("您的浏览器不支持FileReader");
                $this.val('');
                return;
            };
            reader.onload = function(e) {
                //读取成功，显示到页面并发送到服务器
                $this.val('');
                socket.emit('message', {msg:'<a href="javascript:;" class="msg_img" title="点击查看原图"><img src="'+e.target.result+'" alt="img"></a>', color:$('#fontcolor').val(), size:$("#fontsize").val()}, Chat.userid);
            };
            reader.readAsDataURL(file);
        };
    });

    // 点击发送的图片查看原图
    $(".list").delegate(".msg_img", "click", function(event){
        var $img = $(this).find('img'),
            $window = $(window),
            src = $img.attr("src"),
            width = $img[0].naturalWidth,
            height = $img[0].naturalHeight,
            wwidth = $window.width(),
            wheight = $window.height(),
            martop = 0,
            marleft = 0;

        var html = '<div class="cbox" style="width:'+width+'px; height:'+height+'px;"><div class="close">X</div><img src="'+src+'" alt="img" style="width:'+width+'px; height:'+height+'px;" /></div>';

        marleft = width < wwidth ? width/2 : wwidth/2;
        martop = height < wheight ? height/2 : wheight/2-14;

        $("#content").html(html).css({"margin-top":-martop, "margin-left":-marleft}).stop().fadeIn();
        $(".layer").show();

        event.preventDefault();
    });

    $('.layer, #content').on('click', function(){
        if($('#content').find('.close').length){
            $("#content").stop().fadeOut();
            $(".layer").stop().fadeOut();
        }
    })
    // $("#content").on("click", ".close", function(){
    //     $("#content").stop().fadeOut();
    //     $(".layer").hide();
    // })

    $("#fontsize").on("change", function(){
        $('.chat .send textarea').css({"font-size":$(this).val()});
    });
    $("#fontcolor").on("change", function(){
        $('.chat .send textarea').css({"color":$(this).val()});
    });

    Chat.formImg(12);

    // 发送震动
    $('.manager .shk').click(function(){
        var $this = $(this);
        var date = new Date();
        var timestamp = date.getTime();

        var diff = Chat.shake.next - timestamp;
        if($this.children().hasClass('disable')){
            if(diff>0){
                Chat.warning('请 '+ (diff/1000).toFixed(1) +' 秒后执行下一次');
                return;
            }else{
                $this.children().removeClass('disable');
            }
        }
        
        $this.children().addClass('disable');
        
        // 如果3分钟内没有发送震动，则时间间隔重置
        if(diff>=300000){
            Chat.shake.num = 0;
        }
        Chat.shake.getNext(timestamp);
        setTimeout(function(){
            $this.children().removeClass('disable');
        }, Chat.shake.getDiff());
        $('.main').removeClass('shake');
        socket.emit('shake', Chat.userid);
    });
});

// 当页面卸载前的提示
window.onbeforeunload = function(event){
    event = event || window.event;
    
    var msg = "是否要离开？";
    window.event.returnValue = msg;
    return msg;
}
