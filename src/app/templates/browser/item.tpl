<%
	if (typeof image === 'undefined') { var image = images.poster; }
	if (typeof rating === 'object') { var rating = rating.percentage /10; }
%>

<img class="cover-image" src="<%= image %>" style="display: none">
<div class="cover">
	<div class="cover-overlay">
		<i class="fa fa-heart actions-favorites"></i>
		<i class="fa fa-eye actions-watched"></i>

		<% if(typeof rating !== 'undefined'){
		var p_rating = Math.round(rating) / 2;  %>
			<div class="rating" <% if(Settings.coversShowRating){ %> style="display: block;"<% } %> >
				<div class="rating-stars">
					<% for (var i = 1; i <= Math.floor(p_rating); i++) { %>
						<i class="fa fa-star rating-star"></i>
					<% }; %>
					<% if (p_rating % 1 > 0) { %>
						<span class = "fa-stack rating-star-half-container">
							<i class="fa fa-star fa-stack-1x rating-star-half-empty"></i>
							<i class="fa fa-star-half fa-stack-1x rating-star-half"></i>
						</span>
					<% }; %>
					<% for (var i = Math.ceil(p_rating); i < 5; i++) { %>
						<i class="fa fa-star rating-star-empty"></i>
					<% }; %>
				</div>
				<div class="rating-value"><%= rating %>/10</div>
			</div>
		<%} %>
	</div>
</div>

<p class="title" title="<%= title %>"><%= title %></p>
<p class="year"><%= year %></p>

<% if (typeof item_data !== 'undefined') {%>
		<p class="seasons data">
			<%= item_data %>
		</p>
<% } else if(typeof num_seasons !== 'undefined'){%>
	<p class="seasons">
		<%= num_seasons %> <%= num_seasons == 1 ? i18n.__("Season") : i18n.__("Seasons") %>
	</p>
<%}else if (typeof torrents !== 'undefined') { %>
	<p id="movie_quality" class="seasons quality" <% if(Settings.moviesShowQuality){ %> style="display: block;" <% } %> >
		<% q720 = torrents["720p"] !== undefined; q1080 = torrents["1080p"] !== undefined;
		if (q720 && q1080) { %>
			720p/1080p
		<% } else if (q1080) { %>
			1080p
		<% } else if (q720) { %>
			720p
		<% } else { %>
			HDRip
		<% } %>
	</p>
<%} %>

<% if (typeof next_episode !== 'undefined'){%>
<p class="next_episode">
	Next episode: <br/>
	<small>
		<strong><%=next_episode.season%>x<%=next_episode.number%></strong>
		<%=next_episode.title%>
	</small>
</p>
<%} %>
