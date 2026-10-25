package com.portfolio.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class PortfolioController {

    /** Show the closed notebook, or reopen it directly when ?open=true is present. */
    @GetMapping("/")
    public String home(@RequestParam(defaultValue = "false") boolean open, Model model) {
        model.addAttribute("startOpen", open);
        return "index";
    }

    /** Route to one of the four editable student templates. */
    @GetMapping("/member/{id}")
    public String memberPortfolio(@PathVariable int id) {
        if (id < 1 || id > 4) {
            return "redirect:/";
        }
        return "members/member" + id;
    }
}
