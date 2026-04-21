package com.cooperative.olive.dao;

import com.cooperative.olive.entity.Tournee;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface TourneeRepository extends MongoRepository<Tournee, String> {
    List<Tournee> findByDatePrevue(LocalDate datePrevue);
}
