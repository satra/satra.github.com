var github = (function(){
    function render(target, repos){
        var i = 0, t = $(target)[0];
        var fragment = '<li class="lead">GitHub Repos</li>';

        for(i = 0; i < repos.length; i++) {
            fragment += '<li><a href="'+repos[i].html_url+'">'+repos[i].name+'</a></li>';
        }
        t.innerHTML = fragment;
    }
    return {
        showRepos: function(options){
            console.log('getting');
            $.get("https://api.github.com/users/"+options.user+"/repos?sort=pushed"
                , function(data) {
                    console.log(data);
                    var repos = [];
                    if (!data) { return; }
                    for (var i = 0; i < data.length; i++) {
                        if (options.skip_forks && data[i].fork) { continue; }
                        if (data[i].name == 'satra.github.com') { continue; }
                        repos.push(data[i]);
                    }
                    if (options.count) { repos.splice(options.count); }
                    render(options.target, repos);
                }
            );
        }
    };
})();
