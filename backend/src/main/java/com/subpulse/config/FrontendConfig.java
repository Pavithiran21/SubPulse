package com.subpulse.config;

import java.io.IOException;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serves the built frontend (frontend/dist) from the folder in STATIC_DIR, so one service is the whole
 * site on one origin: the app, the API and the refresh cookie (the Docker image sets it). Without
 * STATIC_DIR (development, tests) nothing changes and Vite serves the app.
 *
 * Hashed files under /assets are cached for a year. Any other path that is not a file gets index.html,
 * so React Router can show the page; /api and /assets paths never do, so an unknown API route or a
 * missing asset is still a 404. API controllers are matched before this handler.
 */
@Configuration
@ConditionalOnProperty(name = "STATIC_DIR")
public class FrontendConfig implements WebMvcConfigurer {

    private final String location;

    public FrontendConfig(@Value("${STATIC_DIR}") String staticDir) {
        String uri = Path.of(staticDir).toAbsolutePath().normalize().toUri().toString();
        this.location = uri.endsWith("/") ? uri : uri + "/";
    }

    /** "/" is the calendar; the resource handler never sees an empty path, so it is forwarded here. */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/assets/**")
                .addResourceLocations(location + "assets/")
                .setCacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable());
        registry.addResourceHandler("/**")
                .addResourceLocations(location)
                .setCacheControl(CacheControl.noCache())
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource folder) throws IOException {
                        Resource file = folder.createRelative(resourcePath);
                        if (!resourcePath.isEmpty() && file.exists() && file.isReadable()) {
                            return file;
                        }
                        if (resourcePath.startsWith("api/") || resourcePath.equals("api") || resourcePath.startsWith("assets/")) {
                            return null;
                        }
                        return folder.createRelative("index.html");
                    }
                });
    }
}
