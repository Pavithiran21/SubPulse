package com.subpulse.subscription;

import java.util.Locale;
import java.util.Set;

import org.springframework.data.jpa.domain.Specification;

/** The filters of the subscriptions list, combined in SubscriptionService.list. */
public final class SubscriptionSpecs {

    private SubscriptionSpecs() {
    }

    public static Specification<Subscription> ownedBy(Long userId) {
        return (root, query, cb) -> cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Subscription> statusIn(Set<SubscriptionStatus> statuses) {
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<Subscription> hasCategory(Category category) {
        return (root, query, cb) -> cb.equal(root.get("category"), category);
    }

    public static Specification<Subscription> nameContains(String search) {
        String pattern = likePattern(search);
        return (root, query, cb) -> cb.like(cb.lower(root.get("name")), pattern, '\\');
    }

    /**
     * "%net%" for "Net". % and _ typed by the user are escaped, so they match themselves instead of
     * acting as wildcards.
     */
    public static String likePattern(String search) {
        String escaped = search.trim().toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
