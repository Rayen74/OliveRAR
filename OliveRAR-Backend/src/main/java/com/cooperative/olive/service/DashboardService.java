package com.cooperative.olive.service;

import com.cooperative.olive.dao.ActiviteRepository;
import com.cooperative.olive.dao.CollecteRepository;
import com.cooperative.olive.dao.UserRepository;
import com.cooperative.olive.dao.VergerRepository;
import com.cooperative.olive.entity.*;
import com.cooperative.olive.repository.RecolteRepository;
import com.cooperative.olive.repository.VergerIssueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final VergerRepository vergerRepository;
    private final UserRepository userRepository;
    private final RecolteRepository recolteRepository;
    private final CollecteRepository collecteRepository;
    private final VergerIssueRepository vergerIssueRepository;
    private final ActiviteRepository activiteRepository;

    public Map<String, Object> getCooperativeDashboardStats(String period) {
        Map<String, Object> stats = new HashMap<>();

        // 1. Vue globale
        long totalVergers = vergerRepository.count();
        long totalAgriculteurs = userRepository.findByRole(Role.AGRICULTEUR).size();
        
        List<Recolte> allRecoltes = recolteRepository.findAll();
        
        double totalHarvestedQuantity = allRecoltes.stream()
                .filter(r -> r.getQuantiteOliveKg() != null)
                .mapToDouble(Recolte::getQuantiteOliveKg)
                .sum();

        Map<String, Object> global = new HashMap<>();
        global.put("totalVergers", totalVergers);
        global.put("totalAgriculteurs", totalAgriculteurs);
        global.put("totalHarvestedQuantity", totalHarvestedQuantity);
        
        // 2. Filtrable KPIs
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime filterStart = calculateFilterStart(period, now);
        
        List<Recolte> filteredRecoltes = allRecoltes.stream()
                .filter(r -> r.getDateEnregistrement() != null && !r.getDateEnregistrement().isBefore(filterStart))
                .filter(r -> !r.getDateEnregistrement().isAfter(now))
                .collect(Collectors.toList());
        
        double periodHarvestedQuantity = filteredRecoltes.stream()
                .filter(r -> r.getQuantiteOliveKg() != null)
                .mapToDouble(Recolte::getQuantiteOliveKg)
                .sum();
        long periodHarvestCount = filteredRecoltes.size();
        
        Map<String, Object> filtrable = new HashMap<>();
        filtrable.put("quantity", periodHarvestedQuantity);
        filtrable.put("count", periodHarvestCount);
        filtrable.put("period", period);
        global.put("filtrable", filtrable);
        
        stats.put("global", global);

        Map<String, Object> activity = getActivityStats(period, filterStart, now);
        stats.put("activity", activity);

        // 3. Harvest performance
        long readyVergers = vergerRepository.findAll().stream()
                .filter(v -> "PRET_POUR_RECOLTE".equals(v.getStatut()))
                .count();
        double totalEstimatedYield = vergerRepository.findAll().stream()
                .mapToDouble(Verger::getRendementEstime)
                .sum();
        
        double harvestProgress = totalEstimatedYield > 0 ? (totalHarvestedQuantity / totalEstimatedYield) * 100 : 0;
        
        long completedCollectes = collecteRepository.findAll().stream()
                .filter(c -> "TERMINEE".equals(c.getStatut()))
                .count();
        double avgHarvestedPerCollecte = completedCollectes > 0 ? totalHarvestedQuantity / completedCollectes : 0;

        Map<String, Object> performance = new HashMap<>();
        performance.put("readyVergers", readyVergers);
        performance.put("totalReadyVergers", totalVergers);
        performance.put("harvestProgress", harvestProgress);
        performance.put("totalEstimatedYield", totalEstimatedYield);
        performance.put("avgHarvestedPerCollecte", avgHarvestedPerCollecte);
        
        // 4. Evolution curve
        performance.put("harvestTrend", getHarvestTrend(allRecoltes, period, now));
        
        stats.put("performance", performance);

        // 5. Risk / issues
        List<VergerIssue> issues = vergerIssueRepository.findByDeletedFalse();
        Map<String, Long> issuesBySeverity = issues.stream()
                .filter(i -> i.getGravite() != null)
                .collect(Collectors.groupingBy(VergerIssue::getGravite, Collectors.counting()));
        
        Arrays.asList("FAIBLE", "MOYENNE", "CRITIQUE").forEach(sev -> {
            issuesBySeverity.putIfAbsent(sev, 0L);
        });
        
        stats.put("issues", issuesBySeverity);

        return stats;
    }

    private LocalDateTime calculateFilterStart(String period, LocalDateTime now) {
        switch (period.toLowerCase()) {
            case "day":
                return now.truncatedTo(ChronoUnit.DAYS);
            case "week":
                return now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).truncatedTo(ChronoUnit.DAYS);
            case "month":
            default:
                return now.withDayOfMonth(1).truncatedTo(ChronoUnit.DAYS);
        }
    }

    private List<Map<String, Object>> getHarvestTrend(List<Recolte> recoltes, String period, LocalDateTime now) {
        List<Map<String, Object>> result = new ArrayList<>();
        switch (period.toLowerCase()) {
            case "day":
                buildDayTrend(result, recoltes, now);
                break;
            case "week":
                buildWeekTrend(result, recoltes, now);
                break;
            case "month":
            default:
                buildMonthTrend(result, recoltes, now);
                break;
        }

        return result;
    }

    private void buildDayTrend(List<Map<String, Object>> result, List<Recolte> recoltes, LocalDateTime now) {
        DateTimeFormatter hourFormatter = DateTimeFormatter.ofPattern("HH:mm");
        LocalDateTime startOfDay = now.truncatedTo(ChronoUnit.DAYS);

        for (int hour = 0; hour <= now.getHour(); hour += 3) {
            LocalDateTime rangeStart = startOfDay.plusHours(hour);
            LocalDateTime rangeEnd = rangeStart.plusHours(3).minusNanos(1);
            if (rangeEnd.isAfter(now)) {
                rangeEnd = now;
            }
            String label = rangeStart.format(hourFormatter);
            result.add(buildTrendItem(recoltes, rangeStart, rangeEnd, label));
        }
    }

    private void buildWeekTrend(List<Map<String, Object>> result, List<Recolte> recoltes, LocalDateTime now) {
        DateTimeFormatter weekLabelFormatter = DateTimeFormatter.ofPattern("dd/MM");
        LocalDate currentWeekStart = now.toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        for (int i = 5; i >= 0; i--) {
            LocalDate weekStart = currentWeekStart.minusWeeks(i);
            LocalDateTime rangeStart = weekStart.atStartOfDay();
            LocalDateTime rangeEnd = i == 0
                    ? now
                    : weekStart.plusDays(6).plusDays(1).atStartOfDay().minusNanos(1);
            LocalDate weekEnd = i == 0 ? now.toLocalDate() : weekStart.plusDays(6);
            String label = weekStart.format(weekLabelFormatter) + " - " + weekEnd.format(weekLabelFormatter);
            result.add(buildTrendItem(recoltes, rangeStart, rangeEnd, label));
        }
    }

    private void buildMonthTrend(List<Map<String, Object>> result, List<Recolte> recoltes, LocalDateTime now) {
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMM", Locale.FRENCH);
        YearMonth currentMonth = YearMonth.from(now);

        for (int i = 5; i >= 0; i--) {
            YearMonth month = currentMonth.minusMonths(i);
            LocalDateTime rangeStart = month.atDay(1).atStartOfDay();
            LocalDateTime rangeEnd = i == 0
                    ? now
                    : month.plusMonths(1).atDay(1).atStartOfDay().minusNanos(1);
            String label = month.atDay(1).format(monthFormatter);
            result.add(buildTrendItem(recoltes, rangeStart, rangeEnd, label));
        }
    }

    private Map<String, Object> buildTrendItem(List<Recolte> recoltes, LocalDateTime rangeStart, LocalDateTime rangeEnd, String label) {
        double sum = recoltes.stream()
                .filter(r -> r.getDateEnregistrement() != null && r.getQuantiteOliveKg() != null)
                .filter(r -> !r.getDateEnregistrement().isBefore(rangeStart) && !r.getDateEnregistrement().isAfter(rangeEnd))
                .mapToDouble(Recolte::getQuantiteOliveKg)
                .sum();

        Map<String, Object> item = new HashMap<>();
        item.put("period", label);
        item.put("quantity", sum);
        return item;
    }

    private Map<String, Object> getActivityStats(String period, LocalDateTime filterStart, LocalDateTime now) {
        ZoneId zoneId = ZoneId.systemDefault();

        List<Activite> periodActivities = activiteRepository.findAll().stream()
                .filter(a -> a.getDateAction() != null)
                .filter(a -> {
                    LocalDateTime actionDate = LocalDateTime.ofInstant(a.getDateAction(), zoneId);
                    return !actionDate.isBefore(filterStart) && !actionDate.isAfter(now);
                })
                .filter(a -> Role.AGRICULTEUR.name().equals(a.getUserRole())
                        || Role.RESPONSABLE_CHEF_RECOLTE.name().equals(a.getUserRole()))
                .collect(Collectors.toList());

        long agriculteurCount = periodActivities.stream()
                .filter(a -> Role.AGRICULTEUR.name().equals(a.getUserRole()))
                .count();
        long chefRecolteCount = periodActivities.stream()
                .filter(a -> Role.RESPONSABLE_CHEF_RECOLTE.name().equals(a.getUserRole()))
                .count();

        Map<String, Object> activity = new HashMap<>();
        activity.put("total", periodActivities.size());
        activity.put("agriculteur", agriculteurCount);
        activity.put("chefRecolte", chefRecolteCount);
        activity.put("period", period);
        return activity;
    }
}
