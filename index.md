---
layout: home
title: Rspamd spam filtering system
---

<div class="container-fluid d-flex flex-column p-0" style="height: calc(100vh - var(--navbar-height));">
	<div class="r-banner d-flex flex-grow-1 align-items-center">
		<div class="container text-center py-5">
			<h1 class="mt-0">Rspamd</h1>
			<p>Fast, free and open-source spam filtering system.</p>
			<a class="btn btn-primary btn-large mt-3" href="{{ site.baseurl }}/doc/tutorials/quickstart.html">Quick start <small><i class="fa-solid fa-chevron-right"></i></small></a>
		</div>
		</div>
		<div class="container-fluid w-auto mx-2">
		<div class="row news-row rounded-3 mx-auto my-4 p-3">
			<div class="col-12 col-sm-10">
				<h3 style="margin: 0px;">News: Rspamd 3.9.0 has been released</h3>
				<span class="date"><small>2024-07-12</small></span>
				<p style="margin-bottom: 0px; margin-top: 5px">New stable release is now available.</p>
			</div>
			<div class="col-12 col-sm-2 d-flex justify-content-end align-items-end">
				<a class="btn btn-primary mb-2" href="{{ site.baseurl }}/announce/2024/07/12/rspamd-3.9.0.html">Learn more&nbsp;<i class="fa-solid fa-chevron-right"></i></a>
			</div>
		</div>
		<div class="row news-row rounded-3 mx-auto my-4 p-3">
			<div class="col-12 col-sm-10">
				<h3 style="margin: 0px;">Study: Rspamd and GPT integration</h3>
				<span class="date"><small>2024-07-03</small></span>
				<p style="margin-bottom: 0px; margin-top: 5px">We have studied the efficiency of the new GPT plugin to access LLM (large language models) intelligence.</p>
			</div>
			<div class="col-12 col-sm-2 d-flex justify-content-end align-items-end">
				<a class="btn btn-primary mb-2" href="{{ site.baseurl }}/misc/2024/07/03/gpt.html">Learn more&nbsp;<i class="fa-solid fa-chevron-right"></i></a>
			</div>
		</div>
	</div>
</div>

<div class="container-fluid w-auto mx-2">
    <div class="d-flex flex-wrap justify-content-between my-4">
        <a href="{{ site.baseurl }}/doc/about/performance.html" class="r-tile">
            <img src="img/performance.jpg" alt="">
            <h2>Performance&nbsp;<i class="fa-solid fa-chevron-right"></i></h2>
            <p>Rspamd is designed to be fast and can process up to 100 emails per second
            using a single CPU core</p>
        </a>
        <a href="{{ site.baseurl }}/doc/about/features.html" class="r-tile">
            <img src="img/features.jpg" alt="">
            <h2>Features&nbsp;<i class="fa-solid fa-chevron-right"></i></h2>
            <p>Learn about the wide range of technologies supported by Rspamd to filter spam</p>
        </a>
        <a href="{{ site.baseurl }}/doc/about/comparison.html" class="r-tile">
            <img src="img/compare.jpg" alt="">
            <h2>Compare&nbsp;<i class="fa-solid fa-chevron-right"></i></h2>
            <p>Compare Rspamd with other spam filtering systems</p>
        </a>
        <a href="{{ site.baseurl }}/doc/" class="r-tile">
            <img src="img/documentation.jpg" alt="">
            <h2>Documentation&nbsp;<i class="fa-solid fa-chevron-right"></i></h2>
            <p>Study how to install, configure and extend Rspamd using the documentation provided</p>
        </a>
        <a href="{{ site.baseurl }}/doc/about/media.html" class="r-tile">
            <img src="img/media.jpg" alt="">
            <h2>Media&nbsp;<i class="fa-solid fa-chevron-right"></i></h2>
            <p>Watch videos and presentations about Rspamd</p>
        </a>
        <a href="{{ site.baseurl }}/support.html" class="r-tile">
            <img src="img/support.jpg" alt="">
            <h2>Donation &amp; Support&nbsp;<i class="fa-solid fa-chevron-right"></i></h2>
            <p>Check this page if you need help or want to make a donation or contribute to Rspamd</p>
        </a>
    </div>
	<div class="row who-uses mx-auto my-4">
		<div id="text-carousel" class="carousel slide rounded-3 px-5" data-bs-ride="carousel">
			<div class="carousel-indicators">
				<button type="button" data-bs-target="#text-carousel" data-bs-slide-to="0" aria-label="Slide 1" class="active" aria-current="true"></button>
				<button type="button" data-bs-target="#text-carousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
				<button type="button" data-bs-target="#text-carousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
				<button type="button" data-bs-target="#text-carousel" data-bs-slide-to="3" aria-label="Slide 4"></button>
			</div>
				<!-- Controls carousel-->
				<button class="carousel-control-prev" type="button" data-bs-target="#text-carousel" data-bs-slide="prev">
						<span class="carousel-control-prev-icon"></span>
				</button>
				<button class="carousel-control-next" type="button" data-bs-target="#text-carousel" data-bs-slide="next">
						<span class="carousel-control-next-icon"></span>
				</button>
		    <!-- Wrapper for slides -->
		            <div class="carousel-inner">
										<div class="carousel-item active">
												<div class="carousel-content row">
														<div class="col-sm-3 col-12">
																<a href="https://www.locaweb.com.br/" target="_blank"><img src="img/logo_locaweb.png" class="img-fluid"></a>
														</div>
														<div class="col-sm-9 col-12">
																<blockquote class="blockquote mb-0 px-4 border-start border-3">
																		<p>Locaweb is the largest email provider in Brazil, Locaweb supports more than 10 million inbound email addresses and processes more than 200 million email messages a day.</p>
																		<p>Beyond the Rspamd’s performance can be only compared with some extremely expensive brands available on the market, it has a bunch of powerful features and algorithms that constitute an amazing tool against Spam and other email abuses.</p>
																		<p>Rspamd is broadly customizable and allows multiple strategies to avoid Spam and false positives. In conclusion, Rspamd team is not only giving an incredible support for Locaweb but it has also been a great partner.</p>
																		<footer class="blockquote-footer mt-0">Rafael Abdo <cite title="Source Title">Computer Security Incident Coordinator</cite></footer>
																</blockquote>
														</div>
												</div>
										</div>
										<div class="carousel-item">
												<div class="carousel-content row">
														<div class="col-sm-3 col-12">
																<a href="https://mailcow.email/" target="_blank"><img src="img/cow_mailcow.svg" class="img-fluid" style="max-height: 200px;"></a>
														</div>
														<div class="col-sm-9 col-12">
																<blockquote class="blockquote mb-0 px-4 border-start border-3">
																		<p>Following its fast development and truly innovative ideas, mailcows migration to Rspamd was only a matter of time. The concept of Rspamd is to be expandable. If it is within the scope of a mail filter, Rspamd is able to handle it.</p> <p>Rspamd is an important enrichment for the open source community.</p>
																		<footer class="blockquote-footer mt-0">André Peters <cite title="Source Title">The author of the Mailcow project</cite></footer>
																</blockquote>
														</div>
												</div>
										</div>
										<div class="carousel-item">
												<div class="carousel-content row">
																<div class="col-sm-2 col-12 offset-sm-1">
																		<a href="https://www.adix.nl/" target="_blank"><img src="img/adix_logo.png" class="img-fluid"></a>
																</div>
																<div class="col-sm-9 col-12">
																		<blockquote class="blockquote mb-0 px-4 border-start border-3">
																				<p>Rspamd offers a plethora of filtering options and great performance. Per user settings enable us to provide spam filtering for multiple tenants. Furthermore Rspamd makes it very easy to write custom rules, which allows us to quickly react to spam outbreaks.</p>
																				<footer class="blockquote-footer mt-0">Arthur van Kleef <cite title="Source Title">System Engineer</cite></footer>
																		</blockquote>
																</div>
												</div>
										</div>
										<div class="carousel-item">
												<div class="carousel-content row">
																<div class="col-sm-2 col-12 offset-sm-1">
																		<a href="https://www.ozon.ru/" target="_blank"><img src="img/ozon_logo.png" class="img-fluid"></a>
																</div>
																<div class="col-sm-9 col-12">
																		<blockquote class="blockquote mb-0 px-4 border-start border-3">
																				<p>We started to use the product with the first public versions and for us Rspamd is a natural choice, which is providing speed, flexibility and has rich set of features. </p>
																				<footer class="blockquote-footer mt-0">Andrey Zverev <cite title="Source Title">Lead Engineer</cite></footer>
																		</blockquote>
																</div>
												</div>
										</div>
		            </div>
		</div>
	</div>
</div>
