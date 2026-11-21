package com.portfolio.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class PortfolioController {

    private final String youtubeApiKey;

    public PortfolioController(@Value("${youtube.api.key:}") String youtubeApiKey) {
        this.youtubeApiKey = youtubeApiKey;
    }

    /** Show the closed notebook, or reopen it directly when ?open=true is present. */
    @GetMapping("/")
    public String home(@RequestParam(defaultValue = "false") boolean open, Model model) {
        model.addAttribute("startOpen", open);
        model.addAttribute("youtubeApiKey", youtubeApiKey);
        return "index";
    }

    /** Route to one of the four editable student templates. */
    @GetMapping("/member/{id}")
    public String memberPortfolio(@PathVariable int id, Model model) {
        if (id < 1 || id > 4) {
            return "redirect:/";
        }
        model.addAttribute("youtubeApiKey", youtubeApiKey);
        return "members/member" + id;
    }
}
